import { onAuthStateChanged } from "firebase/auth";
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
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // 🔐 REGISTERED USER (Google / GitHub / Email)
      dispatch(
        loginSuccess({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          provider:
            firebaseUser.providerData[0]?.providerId ===
            "google.com"
              ? "google"
              : firebaseUser.providerData[0]?.providerId ===
                "github.com"
              ? "github"
              : "password",
          isGuest: false,
        })
      );

      // 🛒 Load cart ONLY for registered users
      const cart = await loadCartForUser(firebaseUser.uid);
      dispatch(setCart(cart));
    } else {
      // 🚪 LOGOUT
      dispatch(logout());
      dispatch(clearCart());
    }

    // 🔓 Auth check finished
    dispatch(authResolved());
  });
};
