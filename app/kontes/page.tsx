"use client";
import { useEffect, useState } from "react";
import { Navbar, SandboxBanner, fmtTime } from "../components";

interface Contest { id: number; name: string; slug: string; startsAt: string; endsAt: string; }

export default function KontesList() {
  const [contests, setContests] = useState<Contest[]>([]);

  useEffect(() => {
    fetch("/api/contests").then((r) => r.json()).then(setContests).catch(() => {});
  }, []);

  const statusOf = (c: Contest) => {
    const now = Date.now();
    if (now < new Date(c.startsAt).getTime()) return "Belum mulai";
    if (now > new Date(c.endsAt).getTime()) return "Berakhir";
    return "Berlangsung";
  };

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <SandboxBanner />
        <h1 className="text-2xl font-bold">Kontes</h1>
        <div className="grid gap-4 md:grid-cols-2">
          {contests.map((c) => (
            <a key={c.id} href={`/kontes/${c.slug}`} className="rounded border bg-white p-4 shadow-sm hover:shadow">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900">{c.name}</div>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold">{statusOf(c)}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">{fmtTime(c.startsAt)} — {fmtTime(c.endsAt)}</div>
            </a>
          ))}
          {contests.length === 0 && <p className="text-sm text-slate-500">Belum ada kontes.</p>}
        </div>
      </main>
    </div>
  );
}
