import { createListenerMiddleware } from "@reduxjs/toolkit";
import { saveCartForUser } from "../../utils/indexedDb";
import type { RootState } from "../../app/store";
import { syncCart } from "./hasuraCommerce";
import { hasValidHasuraToken } from "../../utils/hasuraClient";

export const cartListener = createListenerMiddleware();

cartListener.startListening({
  predicate: (_action, currentState, previousState) => {
    const current = currentState as RootState;
    const previous = previousState as RootState;
    return current.cart.items !== previous.cart.items;
  },
  effect: async (_action, listenerApi) => {
    await listenerApi.delay(500);

    const state = listenerApi.getState() as RootState;
    const user = state.auth.user;
    const items = state.cart.items;

    if (!user?.uid || user.provider === "guest" || !hasValidHasuraToken()) return;

    try {
      await syncCart(items);
      return;
    } catch (err) {
      console.warn("Hasura cart sync failed, falling back to IndexedDB:", err);
    }

    try {
      await saveCartForUser(user.uid, items);
    } catch (err) {
      console.error("Failed to sync cart fallback:", err);
    }
  },
});
