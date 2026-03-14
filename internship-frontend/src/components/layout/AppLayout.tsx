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
        overflow-x-hidden
        bg-[var(--bg-page)]
        text-[var(--text-primary)]
        transition-colors duration-300
      "
    >
      {/* Base background only */}
      <div className="fixed inset-0 pointer-events-none overflow-x-hidden">
        <div className="absolute inset-0 bg-[var(--bg-page)]" />
      </div>

      <Navbar />

      <main
        className="
          flex-1
          relative
          z-10
          mx-auto
          w-full
          max-w-6xl
          px-4 sm:px-6 md:px-8
          pt-8 pb-12 sm:pt-10 sm:pb-14 md:pt-12 md:pb-16
        "
      >
        {children}
      </main>

      <Footer />
    </div>
  );
}
