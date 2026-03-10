import { useEffect, useState, type FormEvent } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  fetchSignInMethodsForEmail,
  signOut,
} from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { useLocation, useNavigate, Link } from "react-router-dom";

import { useAppSelector } from "@/app/hooks";
import { auth, githubProvider, googleProvider } from "@/firebase/config";
import AuthCard from "@/features/auth/components/AuthCard";
import AuthShell from "@/features/auth/components/AuthShell";
import { loginFormSchema } from "@/features/auth/schemas/authSchemas";

type AuthProvider = "password" | "google" | "github" | "guest";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      case "auth/invalid-email":
        return "Invalid email address";
      case "auth/too-many-requests":
        return "Too many attempts. Try again later";
      default:
        return "Something went wrong. Please try again";
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

  const getEmailFromCustomData = (customData: unknown): string | null => {
    if (!customData || typeof customData !== "object") return null;
    const email = (customData as { email?: unknown }).email;
    return typeof email === "string" ? email : null;
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, redirectPath]);

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
      } catch (err) {
        if (!mounted) return;

        const firebaseError = err as FirebaseError;
        if (firebaseError.code === "auth/account-exists-with-different-credential") {
          const accountEmail = getEmailFromCustomData(firebaseError.customData);
          if (!accountEmail) {
            setError("This email is already registered with another provider.");
            return;
          }

          const methods = await fetchSignInMethodsForEmail(auth, accountEmail);
          if (methods.includes("github.com")) {
            setError("This email is already registered using GitHub. Please login with GitHub.");
            return;
          }

          setError("This email is already registered with another provider.");
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
      const response = await signInWithEmailAndPassword(auth, email, password);

      await response.user.reload();
      if (!response.user.emailVerified) {
        await signOut(auth);
        setError("Please verify your email before logging in.");
        return;
      }

      setError(null);
    } catch (err) {
      const firebaseError = err as FirebaseError;
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
      setError(null);
    } catch (err) {
      const firebaseError = err as FirebaseError;
      if (firebaseError.code === "auth/account-exists-with-different-credential") {
        const accountEmail = getEmailFromCustomData(firebaseError.customData);
        if (!accountEmail) {
          setError("This email is already registered with another provider.");
          return;
        }

        const methods = await fetchSignInMethodsForEmail(auth, accountEmail);
        if (methods.includes("github.com")) {
          setError("This email is already registered using GitHub. Please login with GitHub.");
        } else {
          setError("This email is already registered with another provider.");
        }
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
      setError(null);
    } catch (err) {
      const firebaseError = err as FirebaseError;
      if (firebaseError.code === "auth/account-exists-with-different-credential") {
        const accountEmail = getEmailFromCustomData(firebaseError.customData);
        if (!accountEmail) {
          setError("This email is already registered with another provider.");
          return;
        }

        const methods = await fetchSignInMethodsForEmail(auth, accountEmail);
        if (methods.includes("google.com")) {
          setError("This email is already registered using Google. Please login with Google.");
        } else {
          setError("This email is already registered with another provider.");
        }
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

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loginEmail();
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
        <form onSubmit={handleEmailSubmit}>
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
          type="submit"
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
        </form>

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
