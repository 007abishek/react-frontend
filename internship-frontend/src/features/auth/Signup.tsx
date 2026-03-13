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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  

  //form validation(zod) 
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

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!password) return null;
    if (password.length < 6) return { label: "Too short", color: "bg-red-500", width: "w-1/4", text: "text-red-500" };
    if (password.length < 8) return { label: "Weak", color: "bg-orange-500", width: "w-2/4", text: "text-orange-500" };
    if (password.length < 12 || !/[A-Z]/.test(password) || !/[0-9]/.test(password))
      return { label: "Fair", color: "bg-yellow-500", width: "w-3/4", text: "text-yellow-600" };
    return { label: "Strong", color: "bg-green-500", width: "w-full", text: "text-green-600" };
  };

  const strength = getPasswordStrength();

  return (
    <AuthShell>
      <AuthCard
        title="Create your account"
        error={error}
        success={success}
        footer={
          <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Login
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                />
              </svg>
            </span>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              className="
                w-full rounded-xl border border-slate-200 dark:border-slate-700
                bg-white dark:bg-slate-800
                pl-10 pr-4 py-3
                text-sm text-slate-900 dark:text-white
                placeholder-slate-400 dark:placeholder-slate-500
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                transition-all duration-200
              "
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </span>
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              className="
                w-full rounded-xl border border-slate-200 dark:border-slate-700
                bg-white dark:bg-slate-800
                pl-10 pr-12 py-3
                text-sm text-slate-900 dark:text-white
                placeholder-slate-400 dark:placeholder-slate-500
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                transition-all duration-200
              "
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
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

          {/* Password Strength Bar */}
          {password && strength && (
            <div className="mt-2">
              <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`}
                />
              </div>
              <p className={`mt-1 text-xs font-medium ${strength.text}`}>
                {strength.label}
              </p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={signup}
          disabled={loading}
          className="
            group relative w-full overflow-hidden
            rounded-xl py-3 px-4
            font-semibold text-sm text-white
            bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500
            hover:from-green-600 hover:via-emerald-600 hover:to-teal-600
            shadow-lg shadow-green-500/30
            ring-1 ring-green-500/40
            focus:outline-none focus:ring-2 focus:ring-green-500
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
                Creating account...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Create Account
              </>
            )}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </button>

        {/* Terms note */}
        <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
          By signing up, you agree to our{" "}
          <span className="underline cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            Terms of Service
          </span>{" "}
          and{" "}
          <span className="underline cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            Privacy Policy
          </span>
        </p>
      </AuthCard>
    </AuthShell>
  );
}