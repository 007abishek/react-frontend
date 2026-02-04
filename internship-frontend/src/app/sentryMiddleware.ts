import * as Sentry from "@sentry/react";
import type { Middleware, AnyAction } from "@reduxjs/toolkit";

export const sentryMiddleware: Middleware =
  () => (next) => (action: unknown) => {
    try {
      return next(action);
    } catch (error) {
      const safeAction = action as AnyAction;

      Sentry.captureException(error, {
        tags: {
          layer: "redux",
        },
        extra: {
          actionType: safeAction?.type,
          actionPayload: safeAction?.payload,
        },
      });

      throw error;
    }
  };
