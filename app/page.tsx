"use client";
import { useEffect, useState } from "react";
import { Navbar, SandboxBanner, fmtTime } from "./components";

interface Problem { id: number; slug: string; title: string; timeLimitMs: number; memoryLimitMb: number; }
interface Contest { id: number; name: string; slug: string; startsAt: string; endsAt: string; }

export default function Home() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);

  useEffect(() => {
    fetch("/api/problems").then((r) => r.json()).then(setProblems).catch(() => {});
    fetch("/api/contests").then((r) => r.json()).then(setContests).catch(() => {});
  }, []);

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6">
        <SandboxBanner />
        <section>
          <h1 className="mb-1 text-2xl font-bold">Daftar Soal</h1>
          <p className="mb-4 text-sm text-slate-500">
            Pilih soal, tulis solusi dalam Python atau JavaScript, lalu submit untuk dinilai otomatis.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {problems.map((p) => (
              <a key={p.id} href={`/soal/${p.slug}`} className="rounded border bg-white p-4 shadow-sm hover:shadow">
                <div className="font-semibold text-slate-900">{p.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  Batas waktu: {p.timeLimitMs} ms • Batas memori: {p.memoryLimitMb} MB
                </div>
              </a>
            ))}
            {problems.length === 0 && <p className="text-sm text-slate-500">Memuat soal…</p>}
          </div>
        </section>
        <section>
          <h2 className="mb-4 text-xl font-bold">Kontes</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {contests.map((c) => (
              <a key={c.id} href={`/kontes/${c.slug}`} className="rounded border bg-white p-4 shadow-sm hover:shadow">
                <div className="font-semibold text-slate-900">{c.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {fmtTime(c.startsAt)} — {fmtTime(c.endsAt)}
                </div>
              </a>
            ))}
            {contests.length === 0 && <p className="text-sm text-slate-500">Belum ada kontes.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
