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
      <h1 className="text-2xl font-bold mb-6">
        GitHub Search
      </h1>

      {/* Mode Toggle */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => {
            setMode("users");
            setPage(1);
          }}
          className={mode === "users" ? "font-bold" : ""}
        >
          Users
        </button>
        <button
          onClick={() => {
            setMode("repos");
            setPage(1);
          }}
          className={mode === "repos" ? "font-bold" : ""}
        >
          Repositories
        </button>
      </div>

      {/* Search */}
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder={`Search GitHub ${mode}`}
        className="border px-3 py-2 rounded w-full mb-4"
      />

      {/* Empty state */}
      {!showResults && (
        <p className="text-gray-500">
          Start typing to search GitHub {mode}.
        </p>
      )}

      {/* Rate limit */}
      {isRateLimited && (
        <p className="text-red-500">
          GitHub API rate limit exceeded. Please try later.
        </p>
      )}

      {/* Loading */}
      {(usersLoading || reposLoading) && showResults && (
        <p className="text-gray-500">Loading...</p>
      )}

      {/* Results */}
      {showResults && mode === "users" &&
        usersData?.items.map((user) => (
          <div key={user.login} className="border p-3 mb-2">
            <a
              href={user.html_url}
              target="_blank"
              rel="noreferrer"
              className="text-blue-500"
            >
              {user.login}
            </a>
          </div>
        ))}

      {showResults && mode === "repos" &&
        reposData?.items.map((repo) => (
          <div key={repo.id} className="border p-3 mb-2">
            <a
              href={repo.html_url}
              target="_blank"
              rel="noreferrer"
              className="text-blue-500"
            >
              {repo.name}
            </a>
            <p className="text-sm">
              ⭐ {repo.stargazers_count}
            </p>
          </div>
        ))}

      {/* Pagination */}
      {showResults && (usersData || reposData) && (
        <div className="flex gap-4 mt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </button>
          <span>Page {page}</span>
          <button onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </AppLayout>
  );
}
