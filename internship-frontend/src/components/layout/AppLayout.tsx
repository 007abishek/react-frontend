import type { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-6">{children}</main>
      <Footer />
    </div>
  );
}
