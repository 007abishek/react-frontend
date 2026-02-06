import { createListenerMiddleware } from "@reduxjs/toolkit";
import { saveCartForUser } from "../../utils/indexedDb";
import type { RootState } from "../../app/store";

export const cartListener = createListenerMiddleware();

cartListener.startListening({
  // 🔑 Only react when the items array in the cart actually changes
  predicate: (_action, currentState, previousState) => {
    const current = currentState as RootState;
    const previous = previousState as RootState;

    return current.cart.items !== previous.cart.items;
  },

  effect: async (_action, listenerApi) => {
    // ⏳ Optional: Add a small delay (debounce) to avoid 
    // excessive writes during rapid quantity changes
    await listenerApi.delay(500);

    const state = listenerApi.getState() as RootState;
    const user = state.auth.user;

    // 🚫 Don't persist if user is not logged in or if there is no UID
    if (!user?.uid) {
      return;
    }

    try {
      // 💾 Save the current items array (including quantities) to IndexedDB
      await saveCartForUser(user.uid, state.cart.items);
      console.log("Cart successfully synced to IndexedDB");
    } catch (error) {
      console.error("Failed to sync cart to IndexedDB:", error);
    }
  },
});