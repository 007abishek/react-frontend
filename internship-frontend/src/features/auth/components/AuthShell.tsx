import type { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
}

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen min-h-dvh items-center justify-center overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)] px-4 py-8 sm:py-12 transition-colors duration-300">
      {/* Match AppLayout background so auth pages feel consistent */}
      <div className="fixed inset-0 pointer-events-none overflow-x-hidden">
        <div className="absolute inset-0 bg-[var(--bg-page)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
