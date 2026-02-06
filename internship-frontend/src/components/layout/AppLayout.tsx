import type { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

type Props = {
  children: ReactNode;
};

export default function AppLayout({ children }: Props) {
  return (
    <div
      className="
        min-h-screen
        flex flex-col
        relative
        overflow-hidden
        bg-slate-50 dark:bg-slate-950
        text-slate-900 dark:text-slate-100
        transition-colors duration-500
      "
    >
      {/* ===== Animated Background Gradients ===== */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Light mode gradients */}
        <div className="absolute -top-[40%] -left-[20%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-blue-200/40 via-purple-200/30 to-pink-200/40 blur-3xl animate-blob dark:opacity-0 transition-opacity duration-500" />
        <div className="absolute top-[20%] -right-[20%] w-[50%] h-[50%] rounded-full bg-gradient-to-bl from-cyan-200/40 via-blue-200/30 to-purple-200/40 blur-3xl animate-blob animation-delay-2000 dark:opacity-0 transition-opacity duration-500" />
        <div className="absolute -bottom-[20%] left-[20%] w-[55%] h-[55%] rounded-full bg-gradient-to-tr from-pink-200/40 via-purple-200/30 to-blue-200/40 blur-3xl animate-blob animation-delay-4000 dark:opacity-0 transition-opacity duration-500" />
        
        {/* Dark mode gradients */}
        <div className="absolute -top-[40%] -left-[20%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/15 to-pink-500/20 blur-3xl animate-blob opacity-0 dark:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-[20%] -right-[20%] w-[50%] h-[50%] rounded-full bg-gradient-to-bl from-cyan-500/20 via-blue-500/15 to-purple-500/20 blur-3xl animate-blob animation-delay-2000 opacity-0 dark:opacity-100 transition-opacity duration-500" />
        <div className="absolute -bottom-[20%] left-[20%] w-[55%] h-[55%] rounded-full bg-gradient-to-tr from-pink-500/20 via-purple-500/15 to-blue-500/20 blur-3xl animate-blob animation-delay-4000 opacity-0 dark:opacity-100 transition-opacity duration-500" />
      </div>

      {/* ===== Noise texture overlay (optional subtle grain) ===== */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.015] dark:opacity-[0.025] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ===== Top navigation ===== */}
      <Navbar />

      {/* ===== Page content ===== */}
      <main
        className="
          flex-1
          relative
          z-10
          mx-auto
          w-full
          max-w-7xl
          px-4 sm:px-6 lg:px-8
          py-8 sm:py-12
        "
      >
        {children}
      </main>

      {/* ===== Footer ===== */}
      <Footer />

      {/* ===== Custom animations ===== */}
      <style >{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(20px, -50px) scale(1.1);
          }
          50% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          75% {
            transform: translate(50px, 50px) scale(1.05);
          }
        }

        .animate-blob {
          animation: blob 20s ease-in-out infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}