import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../firebase/config";
import { loginSuccess, logout, authResolved } from "./authSlice";
import { setCart, clearCart } from "../products/cartSlice";
import { loadCartForUser } from "../../utils/indexedDb";
import type { AppDispatch } from "../../app/store";
import { clearHasuraToken, hasValidHasuraToken, setHasuraToken } from "../../utils/hasuraClient";
import { clearPaymentStatusCache, fetchCart, syncCart } from "../products/hasuraCommerce";

const HASURA_URL = import.meta.env.VITE_HASURA_URL || "http://localhost:8080/v1/graphql";

async function exchangeBackendJwtForHasuraToken(backendJwt: string): Promise<string | null> {
  const res = await fetch(HASURA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        mutation IssueHasuraToken($backendJwt: String!) {
          issueHasuraToken(backendJwt: $backendJwt) {
            token
          }
        }
      `,
      variables: { backendJwt },
    }),
  });

  if (!res.ok) return null;
  const payload = (await res.json()) as {
    data?: { issueHasuraToken?: { token?: string } };
    errors?: Array<{ message?: string }>;
  };
  if (payload.errors?.length) return null;
  return payload.data?.issueHasuraToken?.token ?? null;
}

export const startAuthListener = (dispatch: AppDispatch) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    // if user is logged out
    if (!firebaseUser) {
      localStorage.removeItem("backend_jwt");
      clearHasuraToken();
      clearPaymentStatusCache();
      dispatch(logout());
      dispatch(clearCart());          //clear cart
      dispatch(authResolved());       //clear user state
      return;
    }

    //if reload firebase user

    await firebaseUser.reload();
    
    //detect login provider 
    const providerId = firebaseUser.providerData[0]?.providerId;
    const isOAuthProvider =
      providerId === "google.com" || providerId === "github.com";
    

    //email verification check 
    if (
      !isOAuthProvider &&
      !firebaseUser.isAnonymous &&
      !firebaseUser.emailVerified
    ) {
      await signOut(auth);
      localStorage.removeItem("backend_jwt");
      clearHasuraToken();
      clearPaymentStatusCache();
      dispatch(logout());
      dispatch(clearCart());
      dispatch(authResolved());
      return;
    }

    try {
      //get firebase ID token(this token proves user authenticated by firebase)
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
          localStorage.setItem("backend_jwt", loginData.token);
          setHasuraToken(loginData.hasuraToken);
          clearPaymentStatusCache();
        } else if (loginData?.token) {
          localStorage.setItem("backend_jwt", loginData.token);
          const fallbackHasuraToken = await exchangeBackendJwtForHasuraToken(loginData.token);
          if (fallbackHasuraToken) {
            setHasuraToken(fallbackHasuraToken);
            clearPaymentStatusCache();
          } else {
            clearHasuraToken();
          }
        } else {
          // Keep local read-only flow without noisy console warnings when auth action is unavailable.
          localStorage.removeItem("backend_jwt");
          clearHasuraToken();
        }
      } else {
        await res.text();
        localStorage.removeItem("backend_jwt");
        clearHasuraToken();
      }
    } catch (err) {
      void err;
      localStorage.removeItem("backend_jwt");
      clearHasuraToken();
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
     
    //if user is not guest
    if (!firebaseUser.isAnonymous) {
      if (!hasValidHasuraToken()) {
        const localCart = await loadCartForUser(firebaseUser.uid).catch(() => []);
        dispatch(setCart(localCart));
        dispatch(authResolved());
        return;
      }

      try {
        const cart = await fetchCart();
        dispatch(setCart(cart));
        dispatch(authResolved());
        return;
      } catch (err) {
        console.warn("Hasura cart load failed, falling back:", err);
      }
     
      // if hasura fails load cart from indexeddb
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
