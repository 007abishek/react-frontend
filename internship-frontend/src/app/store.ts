import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/auth/authSlice";
import todoReducer from "../features/todos/todoSlice";
import cartReducer from "../features/products/cartSlice";

import { productApi } from "../features/products/productApi";
import { githubApi } from "../features/github/githubApi";

import { cartListener } from "../features/products/cartListener";

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
      // 🔑 Listener middleware FIRST (side effects)
      .prepend(cartListener.middleware)
      // 🔑 RTK Query middleware AFTER
      .concat(
        productApi.middleware,
        githubApi.middleware
      ),
});

// ✅ Typed helpers
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// 🧪 Debug (optional – you can remove later)
console.log("STORE INIT STATE:", store.getState());
