import { useEffect, useState } from "react";
import type {
  GithubRepo,
  GithubRepoSearchResponse,
  GithubUser,
  GithubUserSearchResponse,
} from "./types";

const GITHUB_API_BASE = "https://api.github.com";

type QueryOptions = {
  skip?: boolean;
};

type QueryState<T> = {
  data?: T;
  isLoading: boolean;
  error?: { status?: number; message: string };
};

function useGithubFetch<T>(url: string, options?: QueryOptions): QueryState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ status?: number; message: string } | undefined>(undefined);

  useEffect(() => {
    if (options?.skip) {
      setData(undefined);
      setIsLoading(false);
      setError(undefined);
      return;
    }

    const controller = new AbortController();//this alllows cancelling requests
    setIsLoading(true);
    setError(undefined);

    void fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          throw {
            status: res.status,
            message: `GitHub request failed with status ${res.status}`,
          };
        }
        return (await res.json()) as T;
      })
      .then((payload) => {
        setData(payload);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const status = typeof err === "object" && err !== null && "status" in err
          ? Number((err as { status?: unknown }).status)
          : undefined;
        const message = err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message?: unknown }).message ?? "GitHub request failed")
            : "GitHub request failed";
        setError({ status, message });
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [url, options?.skip]);

  return { data, isLoading, error };
}

export function useGetUserQuery(username: string, options?: QueryOptions): QueryState<GithubUser> {
  const url = `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}`;
  return useGithubFetch<GithubUser>(url, { skip: options?.skip || !username });
}

export function useGetReposQuery(username: string, options?: QueryOptions): QueryState<GithubRepo[]> {
  const url = `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=10`;
  return useGithubFetch<GithubRepo[]>(url, { skip: options?.skip || !username });
}

export function useSearchUsersQuery(
  params: { query: string; page: number },
  options?: QueryOptions
): QueryState<GithubUserSearchResponse> {
  const url = `${GITHUB_API_BASE}/search/users?q=${encodeURIComponent(params.query)}&page=${params.page}&per_page=10`;
  return useGithubFetch<GithubUserSearchResponse>(url, { skip: options?.skip || !params.query });
}

export function useSearchReposQuery(
  params: { query: string; page: number },
  options?: QueryOptions
): QueryState<GithubRepoSearchResponse> {
  const url = `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(params.query)}&page=${params.page}&per_page=10`;
  return useGithubFetch<GithubRepoSearchResponse>(url, { skip: options?.skip || !params.query });
}
