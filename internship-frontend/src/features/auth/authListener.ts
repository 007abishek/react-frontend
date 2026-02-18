import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../firebase/config";
import {
  loginSuccess,
  logout,
  authResolved,
} from "./authSlice";
import { setCart, clearCart } from "../products/cartSlice";
import { loadCartForUser } from "../../utils/indexedDb";
import type { AppDispatch } from "../../app/store";

// ─── Backend API URL ──────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const startAuthListener = (dispatch: AppDispatch) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {

    // 🔍 NO USER (logged out)
    if (!firebaseUser) {
      dispatch(logout());
      dispatch(clearCart());
      dispatch(authResolved());
      return;
    }

    // 🔄 Ensure latest user state (important after email verification)
    await firebaseUser.reload();

    const providerId =
      firebaseUser.providerData[0]?.providerId;

    const isOAuthProvider =
      providerId === "google.com" ||
      providerId === "github.com";

    // ❌ BLOCK unverified EMAIL/PASSWORD users
    if (
      !isOAuthProvider &&
      !firebaseUser.isAnonymous &&
      !firebaseUser.emailVerified
    ) {
      await signOut(auth);
      dispatch(logout());
      dispatch(clearCart());
      dispatch(authResolved());
      return;
    }

    // ─── Exchange Firebase token for backend JWT ──────────────
    try {
      const firebaseIdToken = await firebaseUser.getIdToken();

      const res = await fetch(`${API_URL}/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ firebaseIdToken }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("jwt", data.token);
      }
    } catch (err) {
      console.warn("Backend unavailable, running Firebase only:", err);
    }

    // ✅ VERIFIED USER — Redux dispatch (UNCHANGED)
    dispatch(
      loginSuccess({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        provider: isOAuthProvider
          ? providerId === "google.com"
            ? "google"
            : "github"
          : firebaseUser.isAnonymous
          ? "guest"
          : "password",
        isGuest: firebaseUser.isAnonymous,
      })
    );

    // 🛒 Load cart for non-guest users
    if (!firebaseUser.isAnonymous) {
      const jwt = localStorage.getItem("jwt");

      // ── Try Postgres first ──────────────────────────────
      if (jwt) {
        try {
          const res = await fetch(`${API_URL}/cart`, {
            headers: { "Authorization": `Bearer ${jwt}` },
          });

          if (res.ok) {
            const data = await res.json();
            dispatch(setCart(data.items));
            console.log("✅ Cart loaded from Postgres");
            dispatch(authResolved());
            return; // ← skip IndexedDB
          }
        } catch (err) {
          console.warn("⚠️ Postgres cart failed, falling back:", err);
        }
      }

      // ── Fallback: IndexedDB (ORIGINAL CODE) ────────────
      try {
        const cart = await loadCartForUser(firebaseUser.uid);
        dispatch(setCart(cart));
        console.log("✅ Cart loaded from IndexedDB (fallback)");

        // Push IndexedDB cart → Postgres silently
        if (jwt && cart.length > 0) {
          fetch(`${API_URL}/cart/sync`, {
            method:  "POST",
            headers: {
              "Content-Type":  "application/json",
              "Authorization": `Bearer ${jwt}`,
            },
            body: JSON.stringify({ items: cart }),
          }).catch(() => {}); // fire and forget
        }
      } catch (err) {
        console.error("❌ Failed to load cart:", err);
      }
    }

    // 🔓 Auth check finished
    dispatch(authResolved());
  });
};