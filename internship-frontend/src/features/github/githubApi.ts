import { createApi } from "@reduxjs/toolkit/query/react";
import type {
  GithubUser,
  GithubRepo,
  GithubUserSearchResponse,
  GithubRepoSearchResponse,
} from "./types";

import { createBaseQueryWithSentry } from "../../utils/baseQueryWithSentry";

export const githubApi = createApi({
  reducerPath: "githubApi",

  // ✅ Sentry-enabled baseQuery with performance monitoring
  baseQuery: createBaseQueryWithSentry(
    "https://api.github.com/",
    "github" // 👈 enables performance tracking + error filtering
  ),

  endpoints: (builder) => ({
    // 👤 Get single user profile
    getUser: builder.query<GithubUser, string>({
      query: (username) => `users/${username}`,
    }),

    // 📦 Get repositories of a user
    getRepos: builder.query<GithubRepo[], string>({
      query: (username) =>
        `users/${username}/repos?sort=updated&per_page=10`,
    }),

    // 🔍 Search GitHub users (with pagination)
    searchUsers: builder.query<
      GithubUserSearchResponse,
      { query: string; page: number }
    >({
      query: ({ query, page }) =>
        `search/users?q=${query}&page=${page}&per_page=10`,
    }),

    // 🔍 Search GitHub repositories/projects (with pagination)
    searchRepos: builder.query<
      GithubRepoSearchResponse,
      { query: string; page: number }
    >({
      query: ({ query, page }) =>
        `search/repositories?q=${query}&page=${page}&per_page=10`,
    }),
  }),
});

// ✅ Auto-generated RTK Query hooks
export const {
  useGetUserQuery,
  useGetReposQuery,
  useSearchUsersQuery,
  useSearchReposQuery,
} = githubApi;
