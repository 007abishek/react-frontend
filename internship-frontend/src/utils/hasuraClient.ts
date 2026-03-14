import { gql } from "@apollo/client";
import { apolloClient } from "./apolloClient";
import { resolveHasuraUrl } from "./hasuraUrl";

const HASURA_URL = resolveHasuraUrl();

export const HASURA_TOKEN_KEY = "jwt";

type GraphQLError = {
  message: string;
};

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return atob(padded);
}

function isLikelyHasuraJwt(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as Record<string, unknown>;
    const claims = payload["https://hasura.io/jwt/claims"];
    if (!claims || typeof claims !== "object") return false;
    const userId = (claims as Record<string, unknown>)["x-hasura-user-id"];
    return typeof userId === "string" && userId.length > 0;
  } catch {
    return false;
  }
}

type SubscriptionMessage<T> = {
  type: string;
  payload?: {
    data?: T;
    errors?: GraphQLError[];
  };
};
//save the jwt token after login 
export function setHasuraToken(token: string): void {
  if (!token) {
    throw new Error("Hasura token missing in response");
  }
  localStorage.setItem(HASURA_TOKEN_KEY, token);
  localStorage.removeItem("hasura_jwt");
}
//retrieve the token before making api requests
export async function getHasuraToken(): Promise<string> {
  const existing = localStorage.getItem(HASURA_TOKEN_KEY);
  if (existing) {
    if (!isLikelyHasuraJwt(existing)) {
      clearHasuraToken();
      throw new Error("Invalid session token. Please login again.");
    }
    return existing;
  }

  // Backward compatibility for older sessions where token was stored separately.
  const legacyHasuraToken = localStorage.getItem("hasura_jwt");
  if (legacyHasuraToken) {
    if (!isLikelyHasuraJwt(legacyHasuraToken)) {
      clearHasuraToken();
      throw new Error("Invalid session token. Please login again.");
    }
    localStorage.setItem(HASURA_TOKEN_KEY, legacyHasuraToken);
    localStorage.removeItem("hasura_jwt");
    return legacyHasuraToken;
  }

  throw new Error("Missing JWT. Please login again.");
}
//used during logout
export function clearHasuraToken(): void {
  localStorage.removeItem("jwt");
  localStorage.removeItem("hasura_jwt");
}
//function sends graphql queries and mutations to hasura
export async function hasuraRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const token = await getHasuraToken();//used for authorization
  const document = gql(query);//apollo requires graphQl queries in this format
  const operationType = getOperationType(query);//detect operation type

  const run = async () => {
    if (operationType === "mutation") {
      const result = await apolloClient.mutate<T>({
        mutation: document,
        variables,
        context: {
          headers: {
            Authorization: `Bearer ${token}`,//token for hasura authentication
          },
        },
      });
      if (!result.data) {
        throw new Error("Hasura response missing data");
      }
      return result.data;
    }

    if (operationType !== "query") {
      throw new Error("hasuraRequest supports only query and mutation operations");
    }

    const result = await apolloClient.query<T>({
      query: document,
      variables,
      fetchPolicy: "no-cache", //always fetch fresh data from server 
      context: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    if (!result.data) {
      throw new Error("Hasura response missing data");
    }
    return result.data;
  };

  return runWithSingleRetry(run);
}
//retry request once if network fails
async function runWithSingleRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (!isTransientNetworkError(error)) {
      throw error;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 250));
    return fn();
  }
}

function isTransientNetworkError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : String((error as { message?: unknown })?.message ?? "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("econnreset") ||
    normalized.includes("connection reset")
  );
}
//operation type detector
function getOperationType(query: string): "query" | "mutation" | "subscription" | null {
  const normalized = query.trimStart().toLowerCase();
  if (normalized.startsWith("query")) return "query";
  if (normalized.startsWith("mutation")) return "mutation";
  if (normalized.startsWith("subscription")) return "subscription";
  return null;
}

export type Unsubscribe = () => void;
//real-time subscriptions
export async function subscribeHasura<T>(
  query: string,
  variables: Record<string, unknown> | undefined,
  onData: (data: T) => void,
  onError?: (error: Error) => void
): Promise<Unsubscribe> {
  let isClosed = false;
  const token = await getHasuraToken();
  const wsUrl = toWsUrl(HASURA_URL);
  const socket = new WebSocket(wsUrl, "graphql-ws");
  //subscriptions use websockets
  const operationId = `sub_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  socket.onopen = () => {
    if (isClosed) return;

    socket.send(
      JSON.stringify({
        type: "connection_init",
        payload: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      })
    );
  };

  socket.onmessage = (event) => {
    if (isClosed) return;

    try {
      const message = JSON.parse(event.data) as SubscriptionMessage<T>;

      if (message.type === "connection_ack") {
        socket.send(
          JSON.stringify({
            id: operationId,
            type: "start",
            payload: {
              query,
              variables,
            },
          })
        );
        return;
      }

      if (message.type === "data" && message.payload?.data) {
        onData(message.payload.data);
        return;
      }

      if (message.type === "error") {
        const msg = message.payload?.errors?.[0]?.message ?? "Subscription error";
        onError?.(new Error(msg));
      }
    } catch (err) {
      onError?.(err as Error);
    }
  };

  socket.onerror = () => {
    if (isClosed) return;
    onError?.(new Error("Hasura subscription socket error"));
  };

  socket.onclose = () => {
    if (isClosed) return;
    onError?.(new Error("Hasura subscription disconnected"));
  };

  return () => {
    if (isClosed) return;
    isClosed = true;

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ id: operationId, type: "stop" }));
    }
    socket.close();
  };
}

function toWsUrl(httpUrl: string): string {
  if (httpUrl.startsWith("https://")) {
    return `wss://${httpUrl.slice("https://".length)}`;
  }
  if (httpUrl.startsWith("http://")) {
    return `ws://${httpUrl.slice("http://".length)}`;
  }
  return httpUrl;
}

//handles tokens,retries, headers,and websockets
