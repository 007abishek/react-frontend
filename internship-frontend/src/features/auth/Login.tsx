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

      const res = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

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
      if (
        err.code ===
        "auth/account-exists-with-different-credential"
      ) {
        const email = err.customData?.email;
        const methods = await fetchSignInMethodsForEmail(
          auth,
          email
        );

        if (methods.includes("github.com")) {
          setError(
            "This email is already registered using GitHub. Please login with GitHub."
          );
        } else {
          setError(
            "This email is already registered with another provider."
          );
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
      if (
        err.code ===
        "auth/account-exists-with-different-credential"
      ) {
        const email = err.customData?.email;
        const methods = await fetchSignInMethodsForEmail(
          auth,
          email
        );

        if (methods.includes("google.com")) {
          setError(
            "This email is already registered using Google. Please login with Google."
          );
        } else {
          setError(
            "This email is already registered with another provider."
          );
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
    <div
      className="
        min-h-screen
        flex items-center justify-center
        bg-gradient-to-br
        from-indigo-50 via-white to-blue-50
        transition-colors duration-500
      "
    >
      <div
        className="
          w-full max-w-md
          bg-white text-slate-900
          rounded-2xl
          shadow-xl
          p-8
          animate-[fadeIn_0.5s_ease-out]
        "
      >
        <h1 className="text-2xl font-bold text-center mb-6">
          Login
        </h1>

        {error && (
          <p
            role="alert"
            className="text-red-500 text-sm mb-3"
          >
            {error}
          </p>
        )}

        <input
          className="
            w-full
            bg-white
            text-slate-900
            border border-slate-300
            rounded-md
            px-3 py-2
            mb-3
            placeholder-slate-400
            transition
            focus:outline-none
            focus:ring-2 focus:ring-blue-500
          "
          placeholder="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
        />

        <input
          type="password"
          className="
            w-full
            bg-white
            text-slate-900
            border border-slate-300
            rounded-md
            px-3 py-2
            mb-4
            placeholder-slate-400
            transition
            focus:outline-none
            focus:ring-2 focus:ring-blue-500
          "
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
        />

        <button
          onClick={loginEmail}
          disabled={loading}
          className="
            w-full
            bg-blue-600 text-white
            py-2 rounded-md
            mb-3
            transition
            hover:bg-blue-700
            disabled:opacity-50
          "
        >
          {loading ? "Logging in..." : "Login with Email"}
        </button>

        <div className="flex gap-3 mb-3">
          <button
            onClick={loginGoogle}
            disabled={loading}
            className="
              flex-1
              bg-white text-slate-900
              border border-slate-300
              py-2 rounded-md
              transition
              hover:bg-slate-50
              disabled:opacity-50
            "
          >
            Google
          </button>

          <button
            onClick={loginGithub}
            disabled={loading}
            className="
              flex-1
              bg-white text-slate-900
              border border-slate-300
              py-2 rounded-md
              transition
              hover:bg-slate-50
              disabled:opacity-50
            "
          >
            GitHub
          </button>
        </div>

        <button
          onClick={loginGuest}
          disabled={loading}
          className="
            w-full
            text-sm text-slate-600
            underline
            mb-4
            transition
            hover:text-slate-800
            disabled:opacity-50
          "
        >
          Continue as Guest
        </button>

        <p className="text-sm text-center">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
