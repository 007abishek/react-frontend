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
    getDefaultMiddleware()
      // 1️⃣ Listener middleware (side effects first)
      .prepend(cartListener.middleware)

      // 2️⃣ Sentry middleware (catch reducer & listener crashes)
      .concat(sentryMiddleware)

      // 3️⃣ RTK Query middleware (API handling)
      .concat(
        productApi.middleware,
        githubApi.middleware
      ),
});

// 🔹 Typed helpers
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// 🧪 Optional debug (remove later)
console.log("STORE INIT STATE:", store.getState());
