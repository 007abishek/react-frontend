import { ApolloClient, HttpLink, InMemoryCache, from } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { resolveHasuraUrl } from "./hasuraUrl";

const HASURA_URL = resolveHasuraUrl();
const HASURA_TOKEN_KEY = "jwt";

function isLikelyJwt(token: string): boolean {
  return token.split(".").length === 3;
}

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem(HASURA_TOKEN_KEY);
  if (token && !isLikelyJwt(token)) {
    localStorage.removeItem(HASURA_TOKEN_KEY);
  }

  const safeToken = token && isLikelyJwt(token) ? token : null;
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
