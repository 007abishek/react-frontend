import { ApolloClient, HttpLink, InMemoryCache, from } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { resolveHasuraUrl } from "./hasuraUrl";

const HASURA_URL = resolveHasuraUrl();
const HASURA_TOKEN_KEY = "jwt";

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem(HASURA_TOKEN_KEY);
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
