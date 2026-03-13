import { gql } from "@apollo/client";
import { apolloClient } from "./apolloClient";
import { resolveHasuraUrl } from "./hasuraUrl";

const HASURA_URL = resolveHasuraUrl();

export const HASURA_TOKEN_KEY = "jwt";

type GraphQLError = {
  message: string;
};

type SubscriptionMessage<T> = {
  type: string;
  payload?: {
    data?: T;
    errors?: GraphQLError[];
  };
};

export function setHasuraToken(token: string): void {
  if (!token || !isLikelyJwt(token)) {
    throw new Error("Hasura token missing in response");
  }
  localStorage.setItem(HASURA_TOKEN_KEY, token);
  localStorage.removeItem("hasura_jwt");
}

export function hasValidHasuraToken(): boolean {
  const token = localStorage.getItem(HASURA_TOKEN_KEY) ?? localStorage.getItem("hasura_jwt");
  return Boolean(token && isLikelyJwt(token));
}

function readStoredHasuraToken(): string | null {
  const existing = localStorage.getItem(HASURA_TOKEN_KEY);
  if (existing) {
    if (isLikelyJwt(existing)) return existing;
    clearHasuraToken();
  }

  // Backward compatibility for older sessions where token was stored separately.
  const legacyHasuraToken = localStorage.getItem("hasura_jwt");
  if (legacyHasuraToken) {
    if (!isLikelyJwt(legacyHasuraToken)) {
      clearHasuraToken();
      return null;
    }
    localStorage.setItem(HASURA_TOKEN_KEY, legacyHasuraToken);
    localStorage.removeItem("hasura_jwt");
    return legacyHasuraToken;
  }

  return null;
}

export async function getHasuraToken(): Promise<string> {
  const token = readStoredHasuraToken();
  if (token) return token;

  throw new Error("Missing JWT. Please login again.");
}

export function clearHasuraToken(): void {
  localStorage.removeItem("jwt");
  localStorage.removeItem("hasura_jwt");
}

export async function hasuraRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const document = gql(query);
  const operationType = getOperationType(query);
  if (operationType !== "query" && operationType !== "mutation") {
    throw new Error("hasuraRequest supports only query and mutation operations");
  }

  const token = operationType === "mutation" ? await getHasuraToken() : readStoredHasuraToken();

  const run = async () => {
    if (operationType === "mutation") {
      const result = await apolloClient.mutate<T>({
        mutation: document,
        variables,
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
    }

    const result = await apolloClient.query<T>({
      query: document,
      variables,
      fetchPolicy: "no-cache",
      context: token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        : undefined,
    });

    if (!result.data) {
      throw new Error("Hasura response missing data");
    }
    return result.data;
  };

  return runWithSingleRetry(run);
}

async function runWithSingleRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isInvalidJwtError(error)) {
      clearHasuraToken();
      return fn();
    }
    if (!isTransientNetworkError(error)) {
      throw error;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 250));
    return fn();
  }
}

function isLikelyJwt(token: string): boolean {
  return token.split(".").length === 3;
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

function isInvalidJwtError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : String((error as { message?: unknown })?.message ?? "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not verify jwt") ||
    normalized.includes("invalid number of parts") ||
    normalized.includes("jwt")
  );
}

function getOperationType(query: string): "query" | "mutation" | "subscription" | null {
  const normalized = query.trimStart().toLowerCase();
  if (normalized.startsWith("query")) return "query";
  if (normalized.startsWith("mutation")) return "mutation";
  if (normalized.startsWith("subscription")) return "subscription";
  return null;
}

export type Unsubscribe = () => void;

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
