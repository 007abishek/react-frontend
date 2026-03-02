import { useMemo, useState } from "react";

import AppLayout from "@/components/layout/AppLayout";
import { useDebounce } from "@/utils/useDebounce";

import { useSearchReposQuery, useSearchUsersQuery } from "./githubApi";
import { githubPageSchema, githubSearchQuerySchema } from "./schemas/githubSchemas";

type Mode = "users" | "repos";

export default function GithubPage() {
  const [mode, setMode] = useState<Mode>("users");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const debouncedQuery = useDebounce(query, 500);

  const immediateQueryError = useMemo(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return "";

    const validation = githubSearchQuerySchema.safeParse(query);
    return validation.success ? "" : validation.error.issues[0]?.message ?? "Invalid search query";
  }, [query]);

  const validatedDebouncedQuery = useMemo(() => {
    const trimmedQuery = debouncedQuery.trim();
    if (!trimmedQuery) return "";

    const validation = githubSearchQuerySchema.safeParse(debouncedQuery);
    return validation.success ? validation.data : "";
  }, [debouncedQuery]);

  const showResults = validatedDebouncedQuery.length > 0;

  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
  } = useSearchUsersQuery(
    { query: validatedDebouncedQuery, page },
    { skip: !showResults || mode !== "users" }
  );

  const {
    data: reposData,
    isLoading: reposLoading,
    error: reposError,
  } = useSearchReposQuery(
    { query: validatedDebouncedQuery, page },
    { skip: !showResults || mode !== "repos" }
  );

  const isRateLimited = (usersError as { status?: number } | undefined)?.status === 403 ||
    (reposError as { status?: number } | undefined)?.status === 403;

  const goToPreviousPage = () => {
    const nextPage = page - 1;
    const validation = githubPageSchema.safeParse(nextPage);
    if (validation.success) {
      setPage(validation.data);
    }
  };

  const goToNextPage = () => {
    const nextPage = page + 1;
    const validation = githubPageSchema.safeParse(nextPage);
    if (validation.success) {
      setPage(validation.data);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">GitHub Search</h1>
        <p className="mt-1 text-slate-500">Search GitHub users and repositories</p>
      </div>

      <div className="mb-4 grid grid-cols-2 rounded-lg bg-slate-100 p-1 dark:bg-zinc-800 sm:inline-flex">
        <button
          onClick={() => {
            setMode("users");
            setPage(1);
          }}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
            mode === "users"
              ? "bg-white dark:bg-zinc-900 shadow text-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Users
        </button>

        <button
          onClick={() => {
            setMode("repos");
            setPage(1);
          }}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
            mode === "repos"
              ? "bg-white dark:bg-zinc-900 shadow text-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Repositories
        </button>
      </div>

      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder={`Search GitHub ${mode}`}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        />
        {immediateQueryError ? (
          <p className="mt-2 text-xs text-rose-400">{immediateQueryError}</p>
        ) : null}
      </div>

      {!showResults && !immediateQueryError && (
        <p className="text-sm text-slate-400">Start typing to search GitHub {mode}.</p>
      )}

      {isRateLimited && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          GitHub API rate limit exceeded. Please try again later.
        </div>
      )}

      {(usersLoading || reposLoading) && showResults && (
        <p className="text-sm text-slate-500">Loading results...</p>
      )}

      <div className="space-y-3">
        {showResults &&
          mode === "users" &&
          usersData?.items.map((user) => (
            <div
              key={user.login}
              className="rounded-lg bg-white p-4 shadow-sm transition hover:shadow-md dark:bg-zinc-900"
            >
              <a
                href={user.html_url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-blue-600 hover:underline"
              >
                {user.login}
              </a>
            </div>
          ))}

        {showResults &&
          mode === "repos" &&
          reposData?.items.map((repo) => (
            <div
              key={repo.id}
              className="rounded-lg bg-white p-4 shadow-sm transition hover:shadow-md dark:bg-zinc-900"
            >
              <a
                href={repo.html_url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-blue-600 hover:underline"
              >
                {repo.name}
              </a>
              <p className="mt-1 text-sm text-slate-500">Star: {repo.stargazers_count}</p>
            </div>
          ))}
      </div>

      {showResults && (usersData || reposData) && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            disabled={page === 1}
            onClick={goToPreviousPage}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Prev
          </button>

          <span className="text-sm text-slate-500">Page {page}</span>

          <button onClick={goToNextPage} className="rounded-md border px-3 py-1.5 text-sm">
            Next
          </button>
        </div>
      )}
    </AppLayout>
  );
}