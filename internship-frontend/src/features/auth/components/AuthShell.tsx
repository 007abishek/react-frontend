import type { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
}

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen min-h-dvh items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 sm:py-12">

      {/* Ambient blobs */}
      <div className="absolute -left-40 -top-40 h-[320px] w-[320px] sm:h-[420px] sm:w-[420px] rounded-full bg-purple-500/30 blur-[100px] sm:blur-[140px] pointer-events-none" />
      <div className="absolute -right-40 top-1/3 h-[280px] w-[280px] sm:h-[380px] sm:w-[380px] rounded-full bg-blue-500/30 blur-[100px] sm:blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 h-[220px] w-[220px] sm:h-[300px] sm:w-[300px] rounded-full bg-pink-500/20 blur-[80px] sm:blur-[120px] pointer-events-none" />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}