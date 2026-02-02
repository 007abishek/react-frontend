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

    // ✅ VERIFIED USER (Google / GitHub / Verified Email)
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

    // 🛒 Load cart ONLY for non-guest users
    if (!firebaseUser.isAnonymous) {
      const cart = await loadCartForUser(firebaseUser.uid);
      dispatch(setCart(cart));
    }

    // 🔓 Auth check finished
    dispatch(authResolved());
  });
};
