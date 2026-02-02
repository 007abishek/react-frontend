import { createListenerMiddleware } from "@reduxjs/toolkit";
import { saveCartForUser } from "../../utils/indexedDb";
import type { RootState } from "../../app/store";

export const cartListener = createListenerMiddleware();

cartListener.startListening({
  // 🔑 Only react when cart items actually change
  predicate: (_action, currentState, previousState) => {
    const current = currentState as RootState;
    const previous = previousState as RootState;

    return current.cart.items !== previous.cart.items;
  },

  effect: async (_action, listenerApi) => {
    const state = listenerApi.getState() as RootState;
    const user = state.auth.user;

    // 🚫 Don't persist if user not logged in
    if (!user?.uid) return;

    await saveCartForUser(user.uid, state.cart.items);
  },
});
