import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import * as Sentry from "@sentry/react";

/**
 * RTK Query baseQuery with:
 * - Sentry error monitoring
 * - GitHub performance tracing
 */
export const createBaseQueryWithSentry = (
  baseUrl: string,
  serviceName?: "github" | "product"
): BaseQueryFn => {
  const rawBaseQuery = fetchBaseQuery({ baseUrl });

  return async (args, api, extraOptions) => {
    // 🚀 Performance tracing ONLY for GitHub
    if (serviceName === "github") {
      return Sentry.startSpan(
        {
          name: "GitHub API Call",
          op: "http.client",
          attributes: {
            endpoint: args,
            baseUrl,
          },
        },
        async () => {
          const result = await rawBaseQuery(args, api, extraOptions);
          handleApiError(result, baseUrl);
          return result;
        }
      );
    }

    // 🔹 Normal API (no performance tracing)
    const result = await rawBaseQuery(args, api, extraOptions);
    handleApiError(result, baseUrl);
    return result;
  };
};

/**
 * Centralized API error handling
 */
function handleApiError(result: any, baseUrl: string) {
  if (!result?.error) return;

  const status = result.error.status;

  // ❌ Ignore expected errors
  if (
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 429
  ) {
    return;
  }

  // ✅ Capture unexpected errors
  Sentry.captureMessage("API Error", {
    extra: {
      baseUrl,
      endpoint: result.error?.originalStatus,
      status,
      response: result.error.data,
    },
  });
}
