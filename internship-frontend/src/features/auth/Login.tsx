import { useEffect, useMemo, useState } from "react";
import {
  fetchSignInMethodsForEmail,
  getRedirectResult,
  GithubAuthProvider,
  linkWithCredential,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { auth, githubProvider, googleProvider } from "@/firebase/config";
import { loginSuccess } from "@/features/auth/authSlice";
import AuthCard from "@/features/auth/components/AuthCard";
import AuthShell from "@/features/auth/components/AuthShell";
import { loginFormSchema } from "@/features/auth/schemas/authSchemas";

type AuthProvider = "password" | "google" | "github" | "guest";

type PendingGithubLinkData = {
  accessToken: string;
  email: string;
};

const PENDING_GITHUB_LINK_KEY = "pendingGithubLink";

function readPendingGithubLink(): PendingGithubLinkData | null {
  try {
    const raw = sessionStorage.getItem(PENDING_GITHUB_LINK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingGithubLinkData>;
    if (typeof parsed.accessToken !== "string" || typeof parsed.email !== "string") {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      email: parsed.email,
    };
  } catch {
    return null;
  }
}

function writePendingGithubLink(value: PendingGithubLinkData): void {
  sessionStorage.setItem(PENDING_GITHUB_LINK_KEY, JSON.stringify(value));
}

function clearPendingGithubLink(): void {
  sessionStorage.removeItem(PENDING_GITHUB_LINK_KEY);
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingLink, setPendingLink] = useState<PendingGithubLinkData | null>(
    () => readPendingGithubLink()
  );

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading } = useAppSelector((state) => state.auth);
  const redirectPath =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/";

  const isMobileBrowser = /Mobi|Android|iPhone|iPad|iPod/i.test(
    typeof navigator !== "undefined" ? navigator.userAgent : ""
  );

  const shouldShowLinkButton = useMemo(() => Boolean(pendingLink?.accessToken), [pendingLink]);

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
    if (!customData || typeof customData !== "object") {
      return null;
    }

    const foundEmail = (customData as { email?: unknown }).email;
    return typeof foundEmail === "string" ? foundEmail : null;
  };

  const resolveUserProvider = (providerId: string): AuthProvider => {
    if (providerId === "google.com") return "google";
    if (providerId === "github.com") return "github";
    if (providerId === "password") return "password";
    return "google";
  };

  const handleSuccess = (
    user: { uid: string; email: string | null },
    provider: AuthProvider
  ) => {
    dispatch(
      loginSuccess({
        uid: user.uid,
        email: user.email,
        provider,
        isGuest: provider === "guest",
      })
    );
  };

  const completeLogin = (
    user: { uid: string; email: string | null },
    provider: AuthProvider
  ) => {
    handleSuccess(user, provider);
    navigate(redirectPath, { replace: true });
  };

  const linkPendingGithubProvider = async (user: { email: string | null }) => {
    const data = pendingLink ?? readPendingGithubLink();
    if (!data) return;

    const normalizedUserEmail = String(user.email ?? "").trim().toLowerCase();
    const normalizedPendingEmail = data.email.trim().toLowerCase();

    if (normalizedUserEmail && normalizedPendingEmail && normalizedUserEmail !== normalizedPendingEmail) {
      setError("Linked account email mismatch. Please try GitHub login again.");
      return;
    }

    try {
      const credential = GithubAuthProvider.credential(data.accessToken);
      await linkWithCredential(auth.currentUser!, credential);
      clearPendingGithubLink();
      setPendingLink(null);
      setError(null);
    } catch (err) {
      const firebaseError = err as FirebaseError;
      if (
        firebaseError.code === "auth/provider-already-linked" ||
        firebaseError.code === "auth/credential-already-in-use"
      ) {
        clearPendingGithubLink();
        setPendingLink(null);
        setError(null);
        return;
      }

      setError("Google login succeeded, but GitHub linking failed. Please retry GitHub login.");
    }
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

        const provider = resolveUserProvider(result.providerId ?? "");
        if (pendingLink || readPendingGithubLink()) {
          await linkPendingGithubProvider(result.user);
        }
        completeLogin(result.user, provider);
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

      completeLogin(response.user, "password");
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

      const response = await signInWithPopup(auth, googleProvider);
      if (pendingLink || readPendingGithubLink()) {
        await linkPendingGithubProvider(response.user);
      }
      completeLogin(response.user, "google");
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
      const response = await signInWithPopup(auth, githubProvider);
      completeLogin(response.user, "github");
    } catch (err) {
      const firebaseError = err as FirebaseError;
      if (firebaseError.code === "auth/account-exists-with-different-credential") {
        const accountEmail = getEmailFromCustomData(firebaseError.customData);
        const pendingCredential = GithubAuthProvider.credentialFromError(firebaseError);

        if (!accountEmail || !pendingCredential?.accessToken) {
          setError("This email is already registered with another provider.");
          return;
        }

        const methods = await fetchSignInMethodsForEmail(auth, accountEmail);

        if (methods.includes("google.com")) {
          const pendingData: PendingGithubLinkData = {
            email: accountEmail,
            accessToken: pendingCredential.accessToken,
          };
          writePendingGithubLink(pendingData);
          setPendingLink(pendingData);
          setError("This email already uses Google. Continue with Google to link GitHub.");
          return;
        }

        setError("This email is already registered with another provider.");
      } else {
        setError("GitHub login failed. Try again");
      }
    } finally {
      setLoading(false);
    }
  };

  const continueWithGoogleForLinking = async () => {
    if (!pendingLink && !readPendingGithubLink()) {
      setError("No pending GitHub credential found. Please retry GitHub login.");
      return;
    }

    await loginGoogle();
  };

  const loginGuest = async () => {
    try {
      setLoading(true);
      const response = await signInAnonymously(auth);
      completeLogin(response.user, "guest");
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
          <p className="mt-2 text-center text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="font-medium text-blue-600 hover:underline">
              Sign up
            </Link>
          </p>
        }
      >
        <input
          className="mb-3 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(null);
          }}
        />

        <input
          type="password"
          className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError(null);
          }}
        />

        <button
          onClick={loginEmail}
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 py-3 font-semibold text-white shadow-lg shadow-blue-500/30 ring-1 ring-blue-500/40 transition-all duration-200 hover:from-blue-700 hover:via-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Login with Email"}
        </button>

        <div className="my-6 flex items-center gap-3 text-sm text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          OR
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {shouldShowLinkButton ? (
          <button
            onClick={continueWithGoogleForLinking}
            disabled={loading}
            className="mb-3 w-full rounded-lg border border-emerald-500 bg-emerald-50 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue with Google to Link GitHub
          </button>
        ) : null}

        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={loginGoogle}
            disabled={loading}
            className="flex-1 rounded-lg bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 py-2 font-semibold text-white shadow-md shadow-blue-500/30 ring-1 ring-blue-500/40 transition-all duration-200 hover:from-indigo-700 hover:via-blue-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Google
          </button>

          <button
            onClick={loginGithub}
            disabled={loading}
            className="flex-1 rounded-lg bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 py-2 font-semibold text-white shadow-md shadow-blue-500/30 ring-1 ring-blue-500/40 transition-all duration-200 hover:from-indigo-700 hover:via-blue-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            GitHub
          </button>
        </div>

        <button
          onClick={loginGuest}
          disabled={loading}
          className="mb-4 w-full text-sm text-slate-600 underline transition hover:text-slate-800 disabled:opacity-50"
        >
          Continue as Guest
        </button>
      </AuthCard>
    </AuthShell>
  );
}
