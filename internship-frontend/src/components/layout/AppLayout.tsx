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
        bg-slate-50 dark:bg-slate-950
        text-slate-900 dark:text-slate-100
        transition-colors duration-300
      "
    >
      {/* ===== Top navigation ===== */}
      <Navbar />

      {/* ===== Page content ===== */}
      <main
        className="
          flex-1
          mx-auto
          w-full
          max-w-7xl
          px-4 sm:px-6 lg:px-8
          py-8
        "
      >
        {children}
      </main>

      {/* ===== Footer ===== */}
      <Footer />
    </div>
  );
}
