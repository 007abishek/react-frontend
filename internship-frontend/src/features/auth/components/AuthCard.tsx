import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  error?: string | null;
  success?: string | null;
  children: ReactNode;
  footer: ReactNode;
}

export default function AuthCard({
  title,
  error,
  success,
  children,
  footer,
}: AuthCardProps) {
  return (
    <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-pink-500/20 blur-2xl" />
      <div className="relative z-10 rounded-2xl border border-white/20 bg-white/90 p-5 backdrop-blur-xl sm:p-8">
        <h1 className="mb-6 text-center text-2xl font-semibold text-slate-900">{title}</h1>

        {error ? (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
          >
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-600">
            {success}
          </p>
        ) : null}

        {children}
        {footer}
      </div>
    </div>
  );
}
