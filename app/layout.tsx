import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Online Judge Coding",
  description: "Platform latihan coding: submit solusi, dinilai otomatis per test case.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen text-slate-900">{children}</body>
    </html>
  );
}
