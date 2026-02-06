import { configureStore } from "@reduxjs/toolkit";

// 🔹 Feature reducers
import authReducer from "../features/auth/authSlice";
import todoReducer from "../features/todos/todoSlice";
import cartReducer from "../features/products/cartSlice";

// 🔹 RTK Query APIs
import { productApi } from "../features/products/productApi";
import { githubApi } from "../features/github/githubApi";

// 🔹 Listener middleware
import { cartListener } from "../features/products/cartListener";

// 🔹 Sentry Redux middleware
import { sentryMiddleware } from "./sentryMiddleware";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    todos: todoReducer,
    cart: cartReducer,

    // RTK Query reducers
    [productApi.reducerPath]: productApi.reducer,
    [githubApi.reducerPath]: githubApi.reducer,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        /**
         * ✅ RTK Query internally stores Request / Response objects
         * These are non-serializable by design and SAFE to ignore.
         */
        ignoredActions: [
          "productApi/executeQuery/pending",
          "productApi/executeQuery/fulfilled",
          "productApi/executeQuery/rejected",
          "githubApi/executeQuery/pending",
          "githubApi/executeQuery/fulfilled",
          "githubApi/executeQuery/rejected",
        ],

        /**
         * ✅ Ignore RTK Query cache + listener metadata
         */
        ignoredPaths: [
          "productApi",
          "githubApi",
          "meta.baseQueryMeta",
        ],

        /**
         * ✅ Allow timestamp-like metadata (Sentry / IndexedDB)
         */
        ignoredActionPaths: ["meta.timestamp", "payload.timestamp"],
      },
    })

      // 1️⃣ Listener middleware FIRST (IndexedDB sync, side effects)
      .prepend(cartListener.middleware)

      // 2️⃣ Sentry middleware (error capture)
      .concat(sentryMiddleware)

      // 3️⃣ RTK Query middleware LAST
      .concat(productApi.middleware, githubApi.middleware),
});

// 🔹 Typed helpers
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// 🧪 Dev-only debug
if (process.env.NODE_ENV === "development") {
  console.log("STORE INITIALIZED:", store.getState());
}
