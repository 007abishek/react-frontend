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
    // if user is logged out
    if (!firebaseUser) {
      localStorage.removeItem("jwt"); //remove authentication tokens
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
    

    //email verification check (security reason force to logout)
    // if (
    //   !isOAuthProvider &&
    //   !firebaseUser.isAnonymous &&
    //   !firebaseUser.emailVerified
    // ) {
    //   await signOut(auth);
    //   localStorage.removeItem("jwt");
    //   clearHasuraToken();
    //   clearPaymentStatusCache();
    //   dispatch(logout());
    //   dispatch(clearCart());
    //   dispatch(authResolved());
    //   return;
    // }

    try {
      let hasuraToken: string | null = null;
      //get firebase ID token(this token proves user authenticated by firebase)
      const firebaseIdToken = await firebaseUser.getIdToken();
      const res = await fetch(HASURA_URL, { //exchange token with backend(backend verifies firebase token and returns hasura jwt)e
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
        if (loginData?.hasuraToken) {
          hasuraToken = loginData.hasuraToken;
          setHasuraToken(hasuraToken); //this sets the token in GraphQl Client
          clearPaymentStatusCache();
        } else {
          if (payload.errors?.length) {
            console.error("authLogin GraphQL errors:", payload.errors);
          } else {
            console.error("authLogin returned no hasuraToken:", payload);
          }
          clearHasuraToken();
        }
      } else {
        const bodyText = await res.text();
        console.error("authLogin HTTP error:", res.status, bodyText);
      }

      if (!hasuraToken) {
        await signOut(auth);
        clearHasuraToken();
        clearPaymentStatusCache();
        dispatch(logout());
        dispatch(clearCart());
        dispatch(authResolved());
        return;
      }
    } catch (err) {
      console.warn("Backend auth exchange failed:", err);
      await signOut(auth);
      clearHasuraToken();
      clearPaymentStatusCache();
      dispatch(logout());
      dispatch(clearCart());
      dispatch(authResolved());
      return;
    }
     //update redux auth state
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

    dispatch(authResolved()); //authentication loading finished
  });
};
