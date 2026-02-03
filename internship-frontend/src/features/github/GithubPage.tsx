import { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import {
  useSearchUsersQuery,
  useSearchReposQuery,
} from "./githubApi";
import { useDebounce } from "../../utils/useDebounce";

type Mode = "users" | "repos";

export default function GithubPage() {
  const [mode, setMode] = useState<Mode>("users");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const debouncedQuery = useDebounce(query, 500);
  const showResults = debouncedQuery.trim().length > 0;

  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
  } = useSearchUsersQuery(
    { query: debouncedQuery, page },
    { skip: !showResults || mode !== "users" }
  );

  const {
    data: reposData,
    isLoading: reposLoading,
    error: reposError,
  } = useSearchReposQuery(
    { query: debouncedQuery, page },
    { skip: !showResults || mode !== "repos" }
  );

  const isRateLimited =
    (usersError as any)?.status === 403 ||
    (reposError as any)?.status === 403;

  return (
    <AppLayout>
      {/* ===== Header ===== */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          GitHub Search
        </h1>
        <p className="mt-1 text-slate-500">
          Search GitHub users and repositories
        </p>
      </div>

      {/* ===== Mode Toggle ===== */}
      <div className="mb-4 inline-flex rounded-lg bg-slate-100 dark:bg-zinc-800 p-1">
        <button
          onClick={() => {
            setMode("users");
            setPage(1);
          }}
          className={`
            px-4 py-1.5 rounded-md text-sm font-medium transition
            ${
              mode === "users"
                ? "bg-white dark:bg-zinc-900 shadow text-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-900"
            }
          `}
        >
          Users
        </button>

        <button
          onClick={() => {
            setMode("repos");
            setPage(1);
          }}
          className={`
            px-4 py-1.5 rounded-md text-sm font-medium transition
            ${
              mode === "repos"
                ? "bg-white dark:bg-zinc-900 shadow text-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-900"
            }
          `}
        >
          Repositories
        </button>
      </div>

      {/* ===== Search Card ===== */}
      <div className="mb-6 rounded-xl bg-white dark:bg-zinc-900 p-4 shadow-sm">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder={`Search GitHub ${mode}`}
          className="
            w-full
            rounded-md
            border border-slate-300 dark:border-zinc-700
            bg-white dark:bg-zinc-800
            px-3 py-2
            text-slate-900 dark:text-white
            placeholder-slate-400
            focus:outline-none
            focus:ring-2 focus:ring-blue-500
          "
        />
      </div>

      {/* ===== States ===== */}
      {!showResults && (
        <p className="text-slate-400 text-sm">
          Start typing to search GitHub {mode}.
        </p>
      )}

      {isRateLimited && (
        <div className="rounded-lg bg-red-50 text-red-600 p-3 text-sm">
          GitHub API rate limit exceeded. Please try again later.
        </div>
      )}

      {(usersLoading || reposLoading) && showResults && (
        <p className="text-slate-500 text-sm">Loading results…</p>
      )}

      {/* ===== Results ===== */}
      <div className="space-y-3">
        {showResults &&
          mode === "users" &&
          usersData?.items.map((user) => (
            <div
              key={user.login}
              className="
                rounded-lg
                bg-white dark:bg-zinc-900
                p-4
                shadow-sm
                transition
                hover:shadow-md
              "
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
              className="
                rounded-lg
                bg-white dark:bg-zinc-900
                p-4
                shadow-sm
                transition
                hover:shadow-md
              "
            >
              <a
                href={repo.html_url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-blue-600 hover:underline"
              >
                {repo.name}
              </a>
              <p className="mt-1 text-sm text-slate-500">
                ⭐ {repo.stargazers_count}
              </p>
            </div>
          ))}
      </div>

      {/* ===== Pagination ===== */}
      {showResults && (usersData || reposData) && (
        <div className="mt-6 flex items-center gap-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="
              rounded-md
              border
              px-3 py-1.5
              text-sm
              disabled:opacity-50
            "
          >
            Prev
          </button>

          <span className="text-sm text-slate-500">
            Page {page}
          </span>

          <button
            onClick={() => setPage((p) => p + 1)}
            className="
              rounded-md
              border
              px-3 py-1.5
              text-sm
            "
          >
            Next
          </button>
        </div>
      )}
    </AppLayout>
  );
}
