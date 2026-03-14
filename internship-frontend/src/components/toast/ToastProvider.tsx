import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ToastContext, type ShowToastInput, type ToastApi, type ToastItem, type ToastVariant } from "./ToastContext";

type Props = {
  children: ReactNode;
};

const DEFAULT_DURATION_MS = 3200;
const MAX_TOASTS = 3;

function buildId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function variantStyles(variant: ToastVariant): { badge: string; icon: ReactNode } {
  switch (variant) {
    case "success":
      return {
        badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30",
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
          </svg>
        ),
      };
    case "error":
      return {
        badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30",
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    case "warning":
      return {
        badge: "bg-amber-50 text-amber-800 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30",
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 9v4m0 4h.01M10.29 3.86l-8.17 14.14A2 2 0 003.83 21h16.34a2 2 0 001.71-3.01L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        ),
      };
    case "info":
    default:
      return {
        badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/30",
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 16h-1v-4h-1m1-4h.01M12 21a9 9 0 110-18 9 9 0 010 18z" />
          </svg>
        ),
      };
  }
}

export default function ToastProvider({ children }: Props) {
  const timers = useRef<Map<string, number>>(new Map());
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    const handle = timers.current.get(id);
    if (handle) window.clearTimeout(handle);
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (input: ShowToastInput) => {
      const id = buildId();
      const variant = input.variant ?? "info";
      const durationMs = Math.max(1200, input.durationMs ?? DEFAULT_DURATION_MS);
      const item: ToastItem = {
        id,
        title: input.title,
        message: input.message,
        variant,
        createdAt: Date.now(),
        durationMs,
      };

      setToasts((prev) => [item, ...prev].slice(0, MAX_TOASTS));

      const timeoutId = window.setTimeout(() => dismiss(id), durationMs);
      timers.current.set(id, timeoutId);
    },
    [dismiss]
  );

  const api: ToastApi = useMemo(
    () => ({
      show,
      success: (message, title) => show({ message, title, variant: "success" }),
      error: (message, title) => show({ message, title, variant: "error" }),
      info: (message, title) => show({ message, title, variant: "info" }),
      warning: (message, title) => show({ message, title, variant: "warning" }),
    }),
    [show]
  );

  const viewport = (
    <div
      className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+1rem)] z-[9999] flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-3 sm:left-auto sm:right-4 sm:translate-x-0"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      {toasts.map((toast) => {
        const { badge, icon } = variantStyles(toast.variant);
        return (
          <div
            key={toast.id}
            className="pointer-events-auto rounded-2xl border border-[color:var(--border-subtle)] bg-[var(--bg-elevated)] shadow-xl"
            role="status"
          >
            <div className="flex items-start gap-3 p-4">
              <div className={`mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl ${badge}`}>
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                {toast.title ? (
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{toast.title}</p>
                ) : null}
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-lg p-1 text-[var(--text-secondary)] transition-colors hover:bg-black/5 hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] dark:hover:bg-white/10"
                aria-label="Dismiss notification"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== "undefined" ? createPortal(viewport, document.body) : viewport}
    </ToastContext.Provider>
  );
}
