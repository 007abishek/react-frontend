import { createListenerMiddleware } from "@reduxjs/toolkit";
import { saveCartForUser } from "../../utils/indexedDb";
import type { RootState } from "../../app/store";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const cartListener = createListenerMiddleware();

cartListener.startListening({
  // Only react when cart items actually change
  predicate: (_action, currentState, previousState) => {
    const current  = currentState as RootState;
    const previous = previousState as RootState;
    return current.cart.items !== previous.cart.items;
  },

  effect: async (_action, listenerApi) => {
    // Debounce — avoid excessive writes
    await listenerApi.delay(500);

    const state  = listenerApi.getState() as RootState;
    const user   = state.auth.user;
    const items  = state.cart.items;

    // Don't persist if not logged in or guest
    if (!user?.uid || user.provider === "guest") return;

    const jwt = localStorage.getItem("jwt");

    // ─── Try Postgres first ───────────────────────────────
    if (jwt) {
      try {
        await fetch(`${API_URL}/cart/sync`, {
          method:  "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${jwt}`,
          },
          body: JSON.stringify({ items }),
        });
        console.log("✅ Cart synced to Postgres");
        return; // success — skip IndexedDB
      } catch (err) {
        console.warn("⚠️ Postgres sync failed, falling back to IndexedDB:", err);
      }
    }

    // ─── Fallback: IndexedDB ──────────────────────────────
    try {
      await saveCartForUser(user.uid, items);
      console.log("✅ Cart synced to IndexedDB (fallback)");
    } catch (err) {
      console.error("❌ Failed to sync cart:", err);
    }
  },
});