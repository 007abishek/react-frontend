import { useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  fetchSignInMethodsForEmail,
  signOut,
} from "firebase/auth";
import {
  auth,
  googleProvider,
  githubProvider,
} from "../../firebase/config";
import { useNavigate, Link } from "react-router-dom";
import { useAppDispatch } from "../../app/hooks";
import { loginSuccess } from "./authSlice";

/* 🔑 Provider type (matches authSlice exactly) */
type AuthProvider = "password" | "google" | "github" | "guest";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  /* ---------------- VALIDATION ---------------- */

  const validate = () => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Enter a valid email address");
      return false;
    }

    if (!password) {
      setError("Password is required");
      return false;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }

    setError(null);
    return true;
  };

  /* ---------------- FIREBASE ERROR MAPPING ---------------- */

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

  /* ---------------- SUCCESS HANDLER ---------------- */

  const handleSuccess = (user: any, provider: AuthProvider) => {
    dispatch(
      loginSuccess({
        uid: user.uid,
        email: user.email,
        provider,
        isGuest: provider === "guest",
      })
    );
    navigate("/");
  };

  /* ---------------- LOGIN WITH EMAIL ---------------- */

  const loginEmail = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const res = await signInWithEmailAndPassword(auth, email, password);

      await res.user.reload();

      if (!res.user.emailVerified) {
        await signOut(auth);
        setError("Please verify your email before logging in.");
        return;
      }

      handleSuccess(res.user, "password");
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- GOOGLE LOGIN ---------------- */

  const loginGoogle = async () => {
    try {
      setLoading(true);
      const res = await signInWithPopup(auth, googleProvider);
      handleSuccess(res.user, "google");
    } catch (err: any) {
      if (err.code === "auth/account-exists-with-different-credential") {
        const email = err.customData?.email;
        const methods = await fetchSignInMethodsForEmail(auth, email);

        if (methods.includes("github.com")) {
          setError(
            "This email is already registered using GitHub. Please login with GitHub."
          );
        } else {
          setError("This email is already registered with another provider.");
        }
      } else {
        setError("Google login failed. Try again");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- GITHUB LOGIN ---------------- */

  const loginGithub = async () => {
    try {
      setLoading(true);
      const res = await signInWithPopup(auth, githubProvider);
      handleSuccess(res.user, "github");
    } catch (err: any) {
      if (err.code === "auth/account-exists-with-different-credential") {
        const email = err.customData?.email;
        const methods = await fetchSignInMethodsForEmail(auth, email);

        if (methods.includes("google.com")) {
          setError(
            "This email is already registered using Google. Please login with Google."
          );
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

  /* ---------------- GUEST LOGIN ---------------- */

  const loginGuest = async () => {
    try {
      setLoading(true);
      const res = await signInAnonymously(auth);
      handleSuccess(res.user, "guest");
    } catch {
      setError("Guest login failed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 flex items-center justify-center px-4">
      {/* 🔮 Page Glow Background */}
      <div className="absolute -top-40 -left-40 h-[420px] w-[420px] rounded-full bg-purple-500/30 blur-[140px]" />
      <div className="absolute top-1/3 -right-40 h-[380px] w-[380px] rounded-full bg-blue-500/30 blur-[140px]" />
      <div className="absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-pink-500/20 blur-[120px]" />

      {/* 🧊 Card Wrapper */}
      <div className="relative z-10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-pink-500/20 blur-2xl" />

        <div className="relative z-10 rounded-2xl bg-white/90 backdrop-blur-xl p-8 border border-white/20">
          <h1 className="text-2xl font-semibold text-center text-slate-900 mb-6">
            Welcome back
          </h1>

          {error && (
            <p
              role="alert"
              className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-200"
            >
              {error}
            </p>
          )}

          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 mb-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
          />

          <input
            type="password"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 mb-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
          />

          {/* ✅ Email Login Button */}
          <button
            onClick={loginEmail}
            disabled={loading}
            className="
              w-full rounded-lg py-3 font-semibold text-white
              bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600
              hover:from-blue-700 hover:via-blue-600 hover:to-indigo-700
              active:scale-[0.99]
              transition-all duration-200
              shadow-lg shadow-blue-500/30
              ring-1 ring-blue-500/40
              focus:outline-none focus:ring-2 focus:ring-blue-500
              disabled:opacity-60 disabled:cursor-not-allowed
              dark:shadow-blue-400/20
              dark:ring-blue-400/40
            "
          >
            {loading ? "Logging in..." : "Login with Email"}
          </button>

          <div className="my-6 flex items-center gap-3 text-sm text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            OR
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="flex gap-3 mb-4">
            {/* 🎨 Google Button - Purple to Pink Gradient */}
            <button
              onClick={loginGoogle}
              disabled={loading}
              className="
                flex-1 rounded-lg py-2 font-semibold text-white
                bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500
                hover:from-indigo-700 hover:via-blue-700 hover:to-cyan-600
                active:scale-[0.99]
                transition-all duration-200
                shadow-md shadow-blue-500/30
                ring-1 ring-blue-500/40
                focus:outline-none focus:ring-2 focus:ring-blue-500
                disabled:opacity-60 disabled:cursor-not-allowed
              "
            >
              Google
            </button>

            {/* 🎨 GitHub Button - Indigo to Cyan Gradient */}
            <button
              onClick={loginGithub}
              disabled={loading}
              className="
                flex-1 rounded-lg py-2 font-semibold text-white
                bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500
                hover:from-indigo-700 hover:via-blue-700 hover:to-cyan-600
                active:scale-[0.99]
                transition-all duration-200
                shadow-md shadow-blue-500/30
                ring-1 ring-blue-500/40
                focus:outline-none focus:ring-2 focus:ring-blue-500
                disabled:opacity-60 disabled:cursor-not-allowed
              "
            >
              GitHub
            </button>
          </div>

          <button
            onClick={loginGuest}
            disabled={loading}
            className="w-full text-sm text-slate-600 underline transition hover:text-slate-800 disabled:opacity-50 mb-4"
          >
            Continue as Guest
          </button>

          <p className="text-sm text-center text-slate-600">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-blue-600 font-medium hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}