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
      <div className="relative z-10 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 transition-colors duration-300">

        {/* Title */}
        <h1 className="mb-6 text-center text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
          {title}
        </h1>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="
              mb-4 flex items-start gap-3
              rounded-xl border border-red-200 dark:border-red-500/30
              bg-red-50 dark:bg-red-500/10
              px-4 py-3
            "
          >
            <span className="mt-0.5 flex-shrink-0 text-red-500 dark:text-red-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
            <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed">
              {error}
            </p>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div
            role="status"
            className="
              mb-4 flex items-start gap-3
              rounded-xl border border-green-200 dark:border-green-500/30
              bg-green-50 dark:bg-green-500/10
              px-4 py-3
            "
          >
            <span className="mt-0.5 flex-shrink-0 text-green-500 dark:text-green-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
            <p className="text-sm text-green-700 dark:text-green-400 leading-relaxed">
              {success}
            </p>
          </div>
        )}

        {/* Form Content */}
        {children}

        {/* Footer */}
        <div className="mt-2">
          {footer}
        </div>
      </div>
    </div>
  );
}
