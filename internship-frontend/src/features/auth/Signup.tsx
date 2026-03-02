import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { Link, useNavigate } from "react-router-dom";

import { auth } from "@/firebase/config";
import AuthCard from "@/features/auth/components/AuthCard";
import AuthShell from "@/features/auth/components/AuthShell";
import { signupFormSchema } from "@/features/auth/schemas/authSchemas";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const validate = () => {
    const validation = signupFormSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Please check your inputs");
      return false;
    }

    setError(null);
    return true;
  };

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

  const signup = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(credential.user);
      await signOut(auth);

      setSuccess("Verification email sent. Please verify your email before logging in.");
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

  return (
    <AuthShell>
      <AuthCard
        title="Create your account"
        error={error}
        success={success}
        footer={
          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-blue-600 hover:underline">
              Login
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
          onClick={signup}
          disabled={loading}
          className="w-full rounded-lg bg-green-600 py-3 font-medium text-white shadow-md transition hover:bg-green-700 hover:shadow-lg disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </AuthCard>
    </AuthShell>
  );
}