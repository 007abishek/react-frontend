import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { auth } from "../../firebase/config";
import { useNavigate, Link } from "react-router-dom";
import type { FirebaseError } from "firebase/app";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  /* ---------------- ERROR MAPPING ---------------- */

  const getErrorMessage = (code: string) => {
    switch (code) {
      case "auth/email-already-in-use":
        return "This email is already registered. Please log in.";
      case "auth/invalid-email":
        return "Invalid email address.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      default:
        return "Something went wrong. Please try again.";
    }
  };

  /* ---------------- SIGNUP FLOW ---------------- */

  const signup = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      // 1️⃣ Create user
      const cred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // 2️⃣ Send verification email
      await sendEmailVerification(cred.user);

      // 3️⃣ Logout unverified user
      await signOut(auth);

      // 4️⃣ Show success message
      setSuccess(
        "Verification email sent. Please verify your email before logging in."
      );

      // 5️⃣ Redirect to login
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      const firebaseError = err as FirebaseError;
      setError(getErrorMessage(firebaseError.code));
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 flex items-center justify-center px-4">
      {/* 🔮 Blurred Glow Background */}
      <div className="absolute -top-40 -left-40 h-[420px] w-[420px] rounded-full bg-purple-500/30 blur-[140px]" />
      <div className="absolute top-1/3 -right-40 h-[380px] w-[380px] rounded-full bg-blue-500/30 blur-[140px]" />
      <div className="absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-pink-500/20 blur-[120px]" />

      {/* 🧊 Signup Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white/90 backdrop-blur-xl p-8 shadow-2xl border border-white/20">
        <h1 className="text-2xl font-semibold text-center text-slate-900 mb-6">
          Create your account
        </h1>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-200"
          >
            {error}
          </p>
        )}

        {success && (
          <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600 border border-green-200">
            {success}
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

        <button
          onClick={signup}
          disabled={loading}
          className="w-full rounded-lg bg-green-600 py-3 text-white font-medium transition hover:bg-green-700 disabled:opacity-50 shadow-md hover:shadow-lg"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <p className="text-sm text-center text-slate-600 mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-blue-600 font-medium hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
