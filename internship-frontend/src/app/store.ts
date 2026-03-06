import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../features/auth/authSlice";
import todoReducer from "../features/todos/todoSlice";
import cartReducer from "../features/products/cartSlice";
import { cartListener } from "../features/products/cartListener";
import { sentryMiddleware } from "./sentryMiddleware";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    todos: todoReducer,
    cart: cartReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActionPaths: ["meta.timestamp", "payload.timestamp"],
      },
    })
      .prepend(cartListener.middleware)
      .concat(sentryMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

if (process.env.NODE_ENV === "development") {
  console.log("STORE INITIALIZED:", store.getState());
}
