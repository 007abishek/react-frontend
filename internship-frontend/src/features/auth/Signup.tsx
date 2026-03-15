import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { Link, useNavigate } from "react-router-dom";

import { auth } from "@/firebase/config";
import AuthCard from "@/features/auth/components/AuthCard";
import AuthShell from "@/features/auth/components/AuthShell";
import { signupFormSchema } from "@/features/auth/schemas/authSchemas";
import { sendOtp, verifyOtp } from "@/features/auth/otpApi";

// ─── GraphQL helpers ──────────────────────────────────────────────────────────
// ─── Step 1: Signup Form ──────────────────────────────────────────────────────
function SignupForm({ onOtpSent }: { onOtpSent: (email: string, password: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const result = signupFormSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Please check your inputs");
      return false;
    }
    setError(null);
    return true;
  };

  const handleSendOtp = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const result = await sendOtp({ email: email.toLowerCase().trim(), purpose: "email_verification" });
      if (!result.success) {
        setError(result.message);
        return;
      }
      onOtpSent(email.toLowerCase().trim(), password);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
    <AuthCard
      title="Create your account"
      error={error}
      footer={
        <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
            Login
          </Link>
        </p>
      }
    >
      {/* Email */}
      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          </span>
          <input
            type="email" autoComplete="email" inputMode="email" placeholder="you@example.com"
            value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>

      {/* Password */}
      <div className="mb-5">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Password</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </span>
          <input
            type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="••••••••"
            value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-12 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
          />
          <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
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
        {password && strength && (
          <div className="mt-2">
            <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
            </div>
            <p className={`mt-1 text-xs font-medium ${strength.text}`}>{strength.label}</p>
          </div>
        )}
      </div>

      {/* Submit */}
      <button type="button" onClick={handleSendOtp} disabled={loading}
        className="group relative w-full overflow-hidden rounded-xl py-3 px-4 font-semibold text-sm text-white bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 shadow-lg shadow-green-500/30 ring-1 ring-green-500/40 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60 transition-all duration-200 active:scale-[0.98]">
        <span className="relative z-10 flex items-center justify-center gap-2">
          {loading ? (
            <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Sending OTP...</>
          ) : (
            <><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Send Verification Code</>
          )}
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      </button>

      <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
        By signing up, you agree to our{" "}
        <span className="underline cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Terms of Service</span>{" "}
        and{" "}
        <span className="underline cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Privacy Policy</span>
      </p>
    </AuthCard>
  );
}

// ─── Step 2: OTP Verification ─────────────────────────────────────────────────
function OtpVerification({
  email, password, onBack,
}: {
  email: string; password: string; onBack: () => void;
}) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();

  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const getFirebaseError = (code: string) => {
    switch (code) {
      case "auth/email-already-in-use": return "This email is already registered. Please log in.";
      case "auth/invalid-email": return "Invalid email address.";
      case "auth/weak-password": return "Password should be at least 6 characters.";
      default: return "Something went wrong creating your account. Please try again.";
    }
  };

  const handleVerify = async () => {
    if (otp.length < 6) { setError("Please enter the 6-digit code."); return; }
    try {
      setLoading(true);
      setError(null);

      // 1. Verify OTP via Hasura → Express
      const result = await verifyOtp({ email, otp: otp.trim(), purpose: "email_verification" });
      if (!result.success) { setError(result.message); return; }

      // 2. OTP verified → create Firebase user (no sendEmailVerification needed)
      await createUserWithEmailAndPassword(auth, email, password);

      // 3. authListener fires automatically → loginSuccess → redirect
      setSuccess("Account created! Redirecting...");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      const firebaseError = err as FirebaseError;
      setError(getFirebaseError(firebaseError.code ?? ""));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResendLoading(true);
      setError(null);
      const result = await sendOtp({ email, purpose: "email_verification" });
      if (!result.success) { setError(result.message); return; }
      setSuccess("New OTP sent!");
      startCooldown();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthCard
      title="Check your email"
      error={error}
      success={success}
      footer={
        <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
          Wrong email?{" "}
          <button type="button" onClick={onBack}
            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
            Go back
          </button>
        </p>
      }
    >
      {/* Info banner */}
      <div className="mb-5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          We sent a 6-digit code to <span className="font-semibold">{email}</span>. Expires in 10 minutes.
        </p>
      </div>

      {/* OTP input */}
      <div className="mb-5">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Verification Code
        </label>
        <input
          type="text" inputMode="numeric" autoComplete="one-time-code"
          placeholder="123456" maxLength={6}
          value={otp}
          onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
        />
      </div>

      {/* Verify button */}
      <button type="button" onClick={handleVerify} disabled={loading || otp.length < 6}
        className="group relative w-full overflow-hidden rounded-xl py-3 px-4 font-semibold text-sm text-white bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 shadow-lg shadow-green-500/30 ring-1 ring-green-500/40 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60 transition-all duration-200 active:scale-[0.98]">
        <span className="relative z-10 flex items-center justify-center gap-2">
          {loading ? (
            <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Verifying...</>
          ) : (
            <><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Verify & Create Account</>
          )}
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      </button>

      {/* Resend */}
      <div className="mt-4 text-center">
        {resendCooldown > 0 ? (
          <p className="text-xs text-slate-400">Resend available in {resendCooldown}s</p>
        ) : (
          <button type="button" onClick={handleResend} disabled={resendLoading}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline underline-offset-2 transition-colors disabled:opacity-50">
            {resendLoading ? "Sending..." : "Didn't receive it? Resend code"}
          </button>
        )}
      </div>
    </AuthCard>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function Signup() {
  const [step, setStep] = useState<"form" | "otp">("form");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");

  return (
    <AuthShell>
      {step === "form" ? (
        <SignupForm
          onOtpSent={(email, password) => {
            setPendingEmail(email);
            setPendingPassword(password);
            setStep("otp");
          }}
        />
      ) : (
        <OtpVerification
          email={pendingEmail}
          password={pendingPassword}
          onBack={() => setStep("form")}
        />
      )}
    </AuthShell>
  );
}
