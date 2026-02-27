import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../firebase/config";
import { loginSuccess, logout, authResolved } from "./authSlice";
import { setCart, clearCart } from "../products/cartSlice";
import { loadCartForUser } from "../../utils/indexedDb";
import type { AppDispatch } from "../../app/store";
import { clearHasuraToken, setHasuraToken } from "../../utils/hasuraClient";
import { clearPaymentStatusCache, fetchCart, syncCart } from "../products/hasuraCommerce";

const HASURA_URL = import.meta.env.VITE_HASURA_URL || "http://localhost:8080/v1/graphql";

export const startAuthListener = (dispatch: AppDispatch) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      localStorage.removeItem("jwt");
      clearHasuraToken();
      clearPaymentStatusCache();
      dispatch(logout());
      dispatch(clearCart());
      dispatch(authResolved());
      return;
    }

    await firebaseUser.reload();

    const providerId = firebaseUser.providerData[0]?.providerId;
    const isOAuthProvider =
      providerId === "google.com" || providerId === "github.com";

    if (
      !isOAuthProvider &&
      !firebaseUser.isAnonymous &&
      !firebaseUser.emailVerified
    ) {
      await signOut(auth);
      localStorage.removeItem("jwt");
      clearHasuraToken();
      clearPaymentStatusCache();
      dispatch(logout());
      dispatch(clearCart());
      dispatch(authResolved());
      return;
    }

    try {
      const firebaseIdToken = await firebaseUser.getIdToken();
      const res = await fetch(HASURA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            mutation AuthLogin($firebaseIdToken: String!) {
              authLogin(firebaseIdToken: $firebaseIdToken) {
                token
                hasuraToken
                user {
                  id
                  uid
                  email
                  provider
                  isGuest
                }
              }
            }
          `,
          variables: { firebaseIdToken },
        }),
      });

      if (res.ok) {
        const payload = (await res.json()) as {
          data?: { authLogin?: { token?: string; hasuraToken?: string } };
          errors?: Array<{ message?: string }>;
        };
        const loginData = payload.data?.authLogin;
        if (loginData?.token && loginData?.hasuraToken) {
          localStorage.setItem("jwt", loginData.token);
          setHasuraToken(loginData.hasuraToken);
          clearPaymentStatusCache();
        } else {
          clearHasuraToken();
        }
      }
    } catch (err) {
      console.warn("Backend auth exchange failed:", err);
    }

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

    if (!firebaseUser.isAnonymous) {
      try {
        const cart = await fetchCart();
        dispatch(setCart(cart));
        dispatch(authResolved());
        return;
      } catch (err) {
        console.warn("Hasura cart load failed, falling back:", err);
      }

      try {
        const cart = await loadCartForUser(firebaseUser.uid);
        dispatch(setCart(cart));

        if (cart.length > 0) {
          syncCart(cart).catch(() => undefined);
        }
      } catch (err) {
        console.error("Failed to load cart fallback:", err);
      }
    }

    dispatch(authResolved());
  });
};
