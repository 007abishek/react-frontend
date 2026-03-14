import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../firebase/config";
import { loginSuccess, logout, authResolved } from "./authSlice";
import { setCart, clearCart } from "../products/cartSlice";
import { loadCartForUser } from "../../utils/indexedDb";
import type { AppDispatch } from "../../app/store";
import { clearHasuraToken, setHasuraToken } from "../../utils/hasuraClient";
import { resolveHasuraUrl } from "../../utils/hasuraUrl";
import { clearPaymentStatusCache, fetchCart, syncCart } from "../products/hasuraCommerce";

const HASURA_URL = resolveHasuraUrl();

export const startAuthListener = (dispatch: AppDispatch) => {
  const setAuthExchangeError = (message: string) => {
    try {
      localStorage.setItem("auth_exchange_error", message);
    } catch {
      // ignore
    }
  };

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

    try {
      let hasuraToken: string | null = null;
      let backendEmailVerified = true;
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
                  emailVerified
                }
              }
            }
          `,
          variables: { firebaseIdToken },
        }),
      });

      if (res.ok) {
        const payload = (await res.json()) as {
          data?: {
            authLogin?: {
              token?: string;
              hasuraToken?: string;
              user?: { emailVerified?: boolean };
            };
          };
          errors?: Array<{ message?: string }>;
        };
        const loginData = payload.data?.authLogin;
        if (loginData?.hasuraToken) {
          hasuraToken = loginData.hasuraToken;
          setHasuraToken(hasuraToken); //this sets the token in GraphQl Client
          clearPaymentStatusCache();
          backendEmailVerified = Boolean(loginData.user?.emailVerified);
        } else {
          if (payload.errors?.length) {
            const messages = payload.errors
              .map((e) => String(e.message ?? "").trim())
              .filter(Boolean);
            console.error("authLogin GraphQL errors:", messages.length ? messages : payload.errors);
            setAuthExchangeError(
              `Login succeeded but server session setup failed: ${messages.length ? messages.join("; ") : "Unknown error."}`
            );
          } else {
            console.error("authLogin returned no hasuraToken:", payload);
            setAuthExchangeError("Login succeeded but no Hasura token was returned. Please try again.");
          }
          clearHasuraToken();
        }
      } else {
        const bodyText = await res.text();
        console.error("authLogin HTTP error:", res.status, bodyText);
        const suffix =
          import.meta.env?.DEV && bodyText
            ? ` (${bodyText.trim().slice(0, 160)})`
            : "";
        setAuthExchangeError(`Server session setup failed (HTTP ${res.status}).${suffix}`);
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

      if (!isOAuthProvider && !firebaseUser.isAnonymous && !backendEmailVerified) {
        localStorage.setItem("pending_otp_verification_email", firebaseUser.email ?? "");
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
      const rawMessage =
        err instanceof Error ? err.message : String((err as { message?: unknown })?.message ?? err);
      const normalized = rawMessage.toLowerCase();
      if (
        normalized.includes("failed to fetch") ||
        normalized.includes("network") ||
        normalized.includes("connection reset") ||
        normalized.includes("err_connection_reset")
      ) {
        setAuthExchangeError(
          `Server session setup failed: unable to reach ${HASURA_URL}. Check VITE_HASURA_URL and that Hasura is running.`
        );
      } else {
        setAuthExchangeError("Server session setup failed. Please try again.");
      }
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
