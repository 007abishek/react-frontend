import { ApolloClient, HttpLink, InMemoryCache, from } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { resolveHasuraUrl } from "./hasuraUrl";

//graphql client setup

//setcontext used to modify request headers before sending them
const HASURA_URL = resolveHasuraUrl();
const HASURA_TOKEN_KEY = "jwt";
//token are encoded
function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return atob(padded);
}
//checking if jwt is valid for hasura(header.payload.signature)
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
//authentication link middleware(authentication link)
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem(HASURA_TOKEN_KEY);
  if (token && !isLikelyHasuraJwt(token)) {
    localStorage.removeItem(HASURA_TOKEN_KEY);
  }

  const safeToken = token && isLikelyHasuraJwt(token) ? token : null;
  return {
    headers: {
      ...headers,
      ...(safeToken ? { Authorization: `Bearer ${safeToken}` } : {}),
    },
  };
});

export const apolloClient = new ApolloClient({
  link: from([
    authLink,
    new HttpLink({
      uri: HASURA_URL,
    }),
  ]),
  cache: new InMemoryCache(),
});
