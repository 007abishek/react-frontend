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

  /* ---------------- SIGNUP (REAL WEBSITE FLOW) ---------------- */

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

      // 3️⃣ Logout unverified user (IMPORTANT)
      await signOut(auth);

      // 4️⃣ Show success message
      setSuccess(
        "Verification email sent. Please verify your email before logging in."
      );

      // 5️⃣ Redirect to login after short delay
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6">
          Create Account
        </h1>

        {error && (
          <p
            role="alert"
            className="text-red-600 text-sm mb-3 text-center"
          >
            {error}
          </p>
        )}

        {success && (
          <p className="text-green-600 text-sm mb-3 text-center">
            {success}
          </p>
        )}

        <input
          className="w-full border rounded px-3 py-2 mb-3"
          placeholder="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
        />

        <input
          className="w-full border rounded px-3 py-2 mb-4"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
        />

        <button
          onClick={signup}
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded mb-3 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <p className="text-sm text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
