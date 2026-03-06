import { ApolloClient, HttpLink, InMemoryCache, from } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

const HASURA_URL =
  import.meta.env.VITE_HASURA_URL || "http://localhost:8080/v1/graphql";
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
