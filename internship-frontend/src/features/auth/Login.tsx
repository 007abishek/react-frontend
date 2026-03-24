import { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  GoogleAuthProvider,
  GithubAuthProvider,
  type AuthCredential,
} from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { useLocation, useNavigate, Link } from "react-router-dom";

import { useAppSelector } from "@/app/hooks";
import { auth, githubProvider, googleProvider } from "@/firebase/config";
import AuthCard from "@/features/auth/components/AuthCard";
import AuthShell from "@/features/auth/components/AuthShell";
import { loginFormSchema } from "@/features/auth/schemas/authSchemas";


type AuthProvider = "password" | "google" | "github" | "guest";

type PendingOAuthLink = {
  email: string;
  provider: "google" | "github"; // provider of the *pending* credential
  credential: AuthCredential;
};

type PendingOAuthLinkStored = {
  email: string;
  provider: PendingOAuthLink["provider"];
  accessToken?: string;
  idToken?: string;
  secret?: string;
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingOAuthLink, setPendingOAuthLink] = useState<PendingOAuthLink | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading } = useAppSelector((state) => state.auth);
  const redirectPath =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/";

  const isMobileBrowser = /Mobi|Android|iPhone|iPad|iPod/i.test(
    typeof navigator !== "undefined" ? navigator.userAgent : ""
  );

  const validate = () => {
    const validation = loginFormSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Please check your inputs");
      return false;
    }
    setError(null);
    return true;
  };

  const getAuthErrorMessage = (code: string) => {
    switch (code) {
      case "auth/user-not-found":
        return "No account found with this email";
      case "auth/wrong-password":
        return "Incorrect password";
      case "auth/invalid-credential":
      case "auth/invalid-login-credentials":
        return "Invalid email or password";
      case "auth/invalid-email":
        return "Invalid email address";
      case "auth/user-disabled":
        return "This account has been disabled.";
      case "auth/network-request-failed":
        return "Network error. Please check your connection and try again.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again later";
      default:
        return "Login failed. Please try again.";
    }
  };

  const getOAuthErrorMessage = (code: string) => {
    switch (code) {
      case "auth/popup-blocked":
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return "Popup was blocked or closed. Please try again.";
      case "auth/unauthorized-domain":
        return "This domain is not authorized in Firebase Auth settings.";
      default:
        return "OAuth login failed. Try again.";
    }
  };
  
  //validation
  const getEmailFromCustomData = (customData: unknown): string | null => {
    if (!customData || typeof customData !== "object") return null;
    const email = (customData as { email?: unknown }).email;
    return typeof email === "string" ? email : null;
  };

  const PENDING_OAUTH_LINK_KEY = "pending_oauth_link";

  const clearPendingOAuthLink = (): void => {
    setPendingOAuthLink(null);
    try {
      sessionStorage.removeItem(PENDING_OAUTH_LINK_KEY);
    } catch {
      // ignore
    }
  };

  const storePendingOAuthLink = (pending: PendingOAuthLink | null): void => {
    setPendingOAuthLink(pending);

    if (!pending) {
      try {
        sessionStorage.removeItem(PENDING_OAUTH_LINK_KEY);
      } catch {
        // ignore
      }
      return;
    }

    const maybeOAuth = pending.credential as unknown as {
      accessToken?: unknown;
      idToken?: unknown;
      secret?: unknown;
    };

    const stored: PendingOAuthLinkStored = {
      email: pending.email,
      provider: pending.provider,
      accessToken: typeof maybeOAuth.accessToken === "string" ? maybeOAuth.accessToken : undefined,
      idToken: typeof maybeOAuth.idToken === "string" ? maybeOAuth.idToken : undefined,
      secret: typeof maybeOAuth.secret === "string" ? maybeOAuth.secret : undefined,
    };

    try {
      sessionStorage.setItem(PENDING_OAUTH_LINK_KEY, JSON.stringify(stored));
    } catch {
      // ignore
    }
  };

  const restorePendingOAuthLinkFromStorage = (): PendingOAuthLink | null => {
    try {
      const raw = sessionStorage.getItem(PENDING_OAUTH_LINK_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<PendingOAuthLinkStored> | null;
      if (
        !parsed ||
        typeof parsed.email !== "string" ||
        (parsed.provider !== "google" && parsed.provider !== "github")
      ) {
        return null;
      }

      if (parsed.provider === "google") {
        const credential = GoogleAuthProvider.credential(
          typeof parsed.idToken === "string" ? parsed.idToken : null,
          typeof parsed.accessToken === "string" ? parsed.accessToken : null
        );
        if (!credential) return null;
        return { email: parsed.email, provider: "google", credential };
      }

      if (typeof parsed.accessToken !== "string" || !parsed.accessToken) return null;
      const credential = GithubAuthProvider.credential(parsed.accessToken);
      if (!credential) return null;
      return { email: parsed.email, provider: "github", credential };
    } catch {
      return null;
    }
  };

  const linkPendingCredentialIfPresent = async (): Promise<void> => {
    if (!pendingOAuthLink) return;

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const currentEmail = currentUser.email?.trim().toLowerCase() ?? null;
    const pendingEmail = pendingOAuthLink.email.trim().toLowerCase();
    if (currentEmail && currentEmail !== pendingEmail) {
      return;
    }

    try {
      await linkWithCredential(currentUser, pendingOAuthLink.credential);
      clearPendingOAuthLink();
      setError(null);
    } catch (err) {
      const firebaseError = err as FirebaseError;
      if (
        firebaseError.code === "auth/provider-already-linked" ||
        firebaseError.code === "auth/credential-already-in-use"
      ) {
        clearPendingOAuthLink();
        setError(null);
        return;
      }
      setError("Account linking failed. Please try again.");
    }
  };

  const handleAccountExistsWithDifferentCredential = async (
    firebaseError: FirebaseError,
    attemptedProvider: PendingOAuthLink["provider"]
  ): Promise<void> => {
    clearPendingOAuthLink();
    const accountEmail = getEmailFromCustomData(firebaseError.customData);
    if (!accountEmail) {
      setError("This email is already registered with another provider.");
      return;
    }

    const pendingCredential =
      attemptedProvider === "google"
        ? GoogleAuthProvider.credentialFromError(firebaseError)
        : GithubAuthProvider.credentialFromError(firebaseError);

    if (pendingCredential) {
      storePendingOAuthLink({
        email: accountEmail,
        provider: attemptedProvider,
        credential: pendingCredential,
      });
    }//saves it in sessionstorage

    let methods: string[] = [];
    try {
      methods = await fetchSignInMethodsForEmail(auth, accountEmail);
    } catch {
      setError("Unable to look up existing sign-in methods for this email. Please try again.");
      return;
    }
    const preferredMethod = methods.includes("password")
      ? "password"
      : methods.includes("google.com")
      ? "google"
      : methods.includes("github.com")
      ? "github"
      : null;

    setEmail(accountEmail);

    if (preferredMethod === "password") {
      setError(
        "An account already exists with this email. Please login with Email & Password to link your Google/GitHub sign-in."
      );
      return;
    }

    if (preferredMethod === "google") {
      setError(
        "An account already exists with this email using Google. Please login with Google to link accounts."
      );
      return;
    }

    if (preferredMethod === "github") {
      setError(
        "An account already exists with this email using GitHub. Please login with GitHub to link accounts."
      );
      return;
    }

    if (methods.length) {
      setError(
        `This email is already registered with: ${methods.join(
          ", "
        )}. Please login using that method to link accounts.`
      );
      return;
    }

    setError("This email is already registered. Please login using the original sign-in method.");
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, redirectPath]);

  useEffect(() => {
    const restored = restorePendingOAuthLinkFromStorage();
    if (restored) {
      setPendingOAuthLink(restored);
    }
  }, []);

  useEffect(() => {
    const pendingEmail = localStorage.getItem("pending_otp_verification_email");
    if (!pendingEmail) return;
    setError("Please verify the OTP sent to your email before logging in.");
    localStorage.removeItem("pending_otp_verification_email");
  }, []);

  useEffect(() => {
    const message = localStorage.getItem("auth_exchange_error");
    if (!message) return;
    setError(message);
    localStorage.removeItem("auth_exchange_error");
  }, []);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const result = await getRedirectResult(auth);
        if (!mounted || !result?.user) return;

        const providerId = result.providerId ?? "";
        const provider: AuthProvider = providerId === "github.com" ? "github" : "google";
        setError(null);
        console.log("OAuth redirect completed for provider:", provider);
        await linkPendingCredentialIfPresent();
      } catch (err) {
        if (!mounted) return;

        const firebaseError = err as FirebaseError;
        if (firebaseError.code === "auth/account-exists-with-different-credential") {
          // Redirect flow is currently used for Google on mobile.
          await handleAccountExistsWithDifferentCredential(firebaseError, "google");
          return;
        }

        setError(getOAuthErrorMessage(firebaseError.code ?? ""));
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const loginEmail = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);

      await linkPendingCredentialIfPresent();
      setError(null);
    } catch (err) {
      const firebaseError = err as FirebaseError;
      if (import.meta.env?.DEV) {
        console.warn("Firebase login failed:", firebaseError.code, firebaseError.message);
      }
      setError(getAuthErrorMessage(firebaseError.code));
    } finally {
      setLoading(false);
    }
  };

  const loginGoogle = async () => {
    try {
      setLoading(true);
      if (isMobileBrowser) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      await signInWithPopup(auth, googleProvider);
      await linkPendingCredentialIfPresent();
      setError(null);
    } catch (err) {
      const firebaseError = err as FirebaseError;
      if (firebaseError.code === "auth/account-exists-with-different-credential") {
        await handleAccountExistsWithDifferentCredential(firebaseError, "google");
      } else {
        setError(getOAuthErrorMessage(firebaseError.code));
      }
    } finally {
      setLoading(false);
    }
  };

  const loginGithub = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, githubProvider);
      await linkPendingCredentialIfPresent();
      setError(null);
    } catch (err) {
      const firebaseError = err as FirebaseError;
      if (firebaseError.code === "auth/account-exists-with-different-credential") {
        await handleAccountExistsWithDifferentCredential(firebaseError, "github");
      } else {
        setError("GitHub login failed. Try again");
      }
    } finally {
      setLoading(false);
    }
  };

  const loginGuest = async () => {
    try {
      setLoading(true);
      await signInAnonymously(auth);
      setError(null);
    } catch {
      setError("Guest login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthCard
        title="Welcome back"
        error={error}
        footer={
          <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Sign up
            </Link>
          </p>
        }
      >
        {/* Email Field */}
        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Email
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </span>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              className="
                w-full rounded-xl border border-slate-200 dark:border-slate-700
                bg-white dark:bg-slate-800
                pl-10 pr-4 py-3
                text-sm text-slate-900 dark:text-white
                placeholder-slate-400 dark:placeholder-slate-500
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                transition-all duration-200
              "
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Password
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </span>
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="
                w-full rounded-xl border border-slate-200 dark:border-slate-700
                bg-white dark:bg-slate-800
                pl-10 pr-12 py-3
                text-sm text-slate-900 dark:text-white
                placeholder-slate-400 dark:placeholder-slate-500
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                transition-all duration-200
              "
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Login Button */}
        <button
          type="button"
          onClick={loginEmail}
          disabled={loading}
          className="
            group relative w-full overflow-hidden
            rounded-xl py-3 px-4
            font-semibold text-sm text-white
            bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600
            hover:from-blue-700 hover:via-blue-600 hover:to-indigo-700
            shadow-lg shadow-blue-500/30
            ring-1 ring-blue-500/40
            focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:cursor-not-allowed disabled:opacity-60
            transition-all duration-200 active:scale-[0.98]
          "
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Logging in...
              </>
            ) : (
              "Login with Email"
            )}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </button>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3 text-xs font-medium text-slate-400">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          OR CONTINUE WITH
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* OAuth Buttons */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Google */}
          <button
            type="button"
            onClick={loginGoogle}
            disabled={loading}
            className="
              flex items-center justify-center gap-2
              rounded-xl border border-slate-200 dark:border-slate-700
              bg-white dark:bg-slate-800
              px-4 py-2.5
              text-sm font-semibold text-slate-700 dark:text-slate-200
              hover:bg-slate-50 dark:hover:bg-slate-700
              shadow-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500
              disabled:cursor-not-allowed disabled:opacity-60
              transition-all duration-200 active:scale-[0.98]
            "
          >
            {/* Google SVG */}
            <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>

          {/* GitHub */}
          <button
            type="button"
            onClick={loginGithub}
            disabled={loading}
            className="
              flex items-center justify-center gap-2
              rounded-xl border border-slate-200 dark:border-slate-700
              bg-white dark:bg-slate-800
              px-4 py-2.5
              text-sm font-semibold text-slate-700 dark:text-slate-200
              hover:bg-slate-50 dark:hover:bg-slate-700
              shadow-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500
              disabled:cursor-not-allowed disabled:opacity-60
              transition-all duration-200 active:scale-[0.98]
            "
          >
            {/* GitHub SVG */}
            <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub
          </button>
        </div>

        {/* Guest */}
        <button
          type="button"
          onClick={loginGuest}
          disabled={loading}
          className="
            w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-600
            px-4 py-2.5
            text-sm font-medium text-slate-500 dark:text-slate-400
            hover:border-slate-400 dark:hover:border-slate-500
            hover:text-slate-700 dark:hover:text-slate-300
            hover:bg-slate-50 dark:hover:bg-slate-800/50
            focus:outline-none focus:ring-2 focus:ring-slate-400
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200 active:scale-[0.98]
          "
        >
          Continue as Guest
        </button>
      </AuthCard>
    </AuthShell>
  );
}


//1. Login with Google
//2. Logout
//3. Try GitHub → error (account-exists-with-different-credential)
//4. Login with Google again
//5. Accounts linked (Google + GitHub)
//6. Logout
//7. Login with GitHub → works
/*** 
//User Login with Google
        │
        ▼
//Firebase Account Created
//(provider: google)
        │
        ▼
User Logout
        │
        ▼
User tries GitHub
        │
        ▼
Firebase Error
auth/account-exists-with-different-credential
        │
        ▼
Store GitHub credential
        │
        ▼
Ask user to login with Google
        │
        ▼
User logs in with Google
        │
        ▼
linkWithCredential()
        │
        ▼
Account Linked
Google + <Github
*/