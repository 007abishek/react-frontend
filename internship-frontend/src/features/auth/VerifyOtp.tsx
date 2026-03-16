import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
//verify otp page
import AuthCard from "@/features/auth/components/AuthCard";
import AuthShell from "@/features/auth/components/AuthShell";
import { sendOtp, verifyOtp } from "@/features/auth/otpApi";

export default function VerifyOtp() {
  const [searchParams] = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get("email") ?? "", [searchParams]);

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const validate = () => {
    if (!email.trim()) {
      setError("Email is required.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Invalid email address.");
      return false;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit OTP.");
      return false;
    }
    setError(null);
    return true;
  };

  const resend = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const result = await sendOtp({ email: email.trim(), purpose: "email_verification" });
      if (!result.success) throw new Error(result.message || "Failed to resend OTP.");

      setSuccess("OTP resent. Please check your email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const result = await verifyOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        purpose: "email_verification",
      });
      if (!result.success) throw new Error(result.message || "OTP verification failed.");

      setSuccess("OTP verified. You can now login.");
      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthCard
        title="Verify OTP"
        error={error}
        success={success}
        footer={
          <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
            Back to{" "}
            <Link
              to="/login"
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Login
            </Link>
          </p>
        }
      >
        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Email
          </label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            className="
              w-full rounded-xl border border-slate-200 dark:border-slate-700
              bg-white dark:bg-slate-800
              px-4 py-3
              text-sm text-slate-900 dark:text-white
              placeholder-slate-400 dark:placeholder-slate-500
              focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
              transition-all duration-200
            "
            placeholder="you@example.com"
          />
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            OTP
          </label>
          <input
            inputMode="numeric"
            value={otp}
            onChange={(e) => {
              const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 6);
              setOtp(onlyDigits);
              setError(null);
            }}
            className="
              w-full rounded-xl border border-slate-200 dark:border-slate-700
              bg-white dark:bg-slate-800
              px-4 py-3
              text-sm text-slate-900 dark:text-white
              placeholder-slate-400 dark:placeholder-slate-500
              focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
              transition-all duration-200
            "
            placeholder="Enter OTP"
          />
        </div>

        <button
          type="button"
          onClick={verify}
          disabled={loading}
          className="
            w-full rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60
            text-white font-semibold py-3 text-sm transition-colors
          "
        >
          {loading ? "Verifying..." : "Verify"}
        </button>

        <button
          type="button"
          onClick={resend}
          disabled={loading}
          className="
            mt-3 w-full rounded-xl border border-slate-200 dark:border-slate-700
            bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700
            text-slate-700 dark:text-slate-200 font-semibold py-3 text-sm transition-colors
          "
        >
          Resend OTP
        </button>
      </AuthCard>
    </AuthShell>
  );
}
