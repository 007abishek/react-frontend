const DEFAULT_HASURA_URL = "http://127.0.0.1:8080/v1/graphql";

function isLocalHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  );
}

//api endpoint configuration

export function resolveHasuraUrl(): string {
  const configuredUrl =
    import.meta.env.VITE_HASURA_URL ||
    import.meta.env.VITE_API_URL ||
    DEFAULT_HASURA_URL;
  const rawUrl = configuredUrl.trim();

  if (typeof window === "undefined" || window.location.protocol !== "https:") {
    return rawUrl;
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === "http:" && !isLocalHost(parsed.hostname)) {
      parsed.protocol = "https:";
      return parsed.toString();
    }
  } catch {
    // Keep original value if URL parsing fails.
  }

  return rawUrl;
}
