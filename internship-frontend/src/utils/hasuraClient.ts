const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const HASURA_URL = import.meta.env.VITE_HASURA_URL || "http://localhost:8080/v1/graphql";

const HASURA_TOKEN_KEY = "hasura_jwt";

type GraphQLError = {
  message: string;
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: GraphQLError[];
};

type SubscriptionMessage<T> = {
  type: string;
  payload?: {
    data?: T;
    errors?: GraphQLError[];
  };
};

async function fetchHasuraToken(): Promise<string> {
  const backendJwt = localStorage.getItem("jwt");
  if (!backendJwt) {
    throw new Error("Missing backend JWT. Please login again.");
  }

  const res = await fetch(`${API_URL}/auth/hasura-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${backendJwt}`,
    },
    body: "{}",
  });

  if (!res.ok) {
    throw new Error(`Failed to get Hasura token (${res.status})`);
  }

  const body = (await res.json()) as { token?: string };
  if (!body.token) {
    throw new Error("Hasura token missing in response");
  }

  localStorage.setItem(HASURA_TOKEN_KEY, body.token);
  return body.token;
}

export async function getHasuraToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const existing = localStorage.getItem(HASURA_TOKEN_KEY);
    if (existing) return existing;
  }
  return fetchHasuraToken();
}

export function clearHasuraToken(): void {
  localStorage.removeItem(HASURA_TOKEN_KEY);
}

export async function hasuraRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  let token = await getHasuraToken();

  const run = async (jwt: string) => {
    const res = await fetch(HASURA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      throw new Error(`Hasura request failed (${res.status})`);
    }

    const json = (await res.json()) as GraphQLResponse<T>;
    if (json.errors?.length) {
      throw new Error(json.errors[0].message);
    }
    if (!json.data) {
      throw new Error("Hasura response missing data");
    }
    return json.data;
  };

  try {
    return await run(token);
  } catch (error) {
    // One retry with a refreshed Hasura token (expired/stale token case).
    token = await getHasuraToken(true);
    return run(token);
  }
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
