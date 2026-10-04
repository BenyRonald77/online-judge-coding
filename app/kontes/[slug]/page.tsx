"use client";
import { useEffect, useState } from "react";
import { Navbar, SandboxBanner, fmtTime } from "../../components";

interface ContestDetail {
  name: string; slug: string; startsAt: string; endsAt: string;
  freezeMinutes: number; status: string;
  problems: { order: number; problem: { slug: string; title: string } }[];
}
interface BoardRow {
  username: string; displayName: string; solved: number; totalTimeMinutes: number;
  perProblem: { problemSlug: string; solved: boolean; attempts: number; timeMinutes: number | null }[];
}
interface Board { frozen: boolean; rows: BoardRow[]; }

export default function KontesDetail({ params }: { params: { slug: string } }) {
  const [contest, setContest] = useState<ContestDetail | null>(null);
  const [board, setBoard] = useState<Board | null>(null);

  useEffect(() => {
    fetch(`/api/contests/${params.slug}`).then((r) => r.json()).then(setContest).catch(() => {});
    fetch(`/api/contests/${params.slug}/scoreboard`).then((r) => r.json()).then(setBoard).catch(() => {});
  }, [params.slug]);

  if (!contest) return <div><Navbar /><main className="mx-auto max-w-5xl px-4 py-6">Memuat…</main></div>;

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <SandboxBanner />
        <div>
          <h1 className="text-2xl font-bold">{contest.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {fmtTime(contest.startsAt)} — {fmtTime(contest.endsAt)}
            {" "}• Status: <strong>{contest.status.replace("_", " ")}</strong>
            {contest.freezeMinutes > 0 && ` • Freeze ${contest.freezeMinutes} menit terakhir`}
          </p>
        </div>
        <section className="rounded border bg-white p-4">
          <h2 className="mb-2 font-semibold">Soal kontes</h2>
          <ul className="space-y-1 text-sm">
            {contest.problems.map((cp) => (
              <li key={cp.problem.slug}>
                <span className="mr-2 font-mono text-slate-500">{String(cp.order).padStart(2, "0")}</span>
                <a className="text-blue-600 underline" href={`/soal/${cp.problem.slug}`}>{cp.problem.title}</a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            Submit dari halaman soal dengan mencantumkan kontes ini tidak tersedia di UI —
            gunakan API <code>POST /api/submissions</code> dengan <code>contestSlug</code>,
            atau submit biasa untuk latihan.
          </p>
        </section>
        <section className="rounded border bg-white p-4">
          <div className="mb-2 flex items-center gap-3">
            <h2 className="font-semibold">Scoreboard</h2>
            {board?.frozen && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                Frozen
              </span>
            )}
          </div>
          {!board || board.rows.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada submission yang dinilai.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-500">
                <th className="py-1">#</th><th>Peserta</th><th>Solved</th><th>Total waktu</th>
                {contest.problems.map((cp) => (
                  <th key={cp.problem.slug} className="text-center">{cp.problem.slug}</th>
                ))}
              </tr></thead>
              <tbody>
                {board.rows.map((row, i) => (
                  <tr key={row.username} className="border-t">
                    <td className="py-1">{i + 1}</td>
                    <td>{row.displayName} <span className="text-xs text-slate-400">({row.username})</span></td>
                    <td className="font-bold">{row.solved}</td>
                    <td>{row.totalTimeMinutes} mnt</td>
                    {row.perProblem.map((pp) => (
                      <td key={pp.problemSlug} className="text-center">
                        {pp.solved ? (
                          <span className="font-semibold text-green-700">✓ {pp.timeMinutes}&apos;</span>
                        ) : pp.attempts > 0 ? (
                          <span className="text-red-600">✗{pp.attempts}</span>
                        ) : (
                          <span className="text-slate-300">–</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Penalti: 20 menit per submission salah sebelum Accepted pertama.
          </p>
        </section>
      </main>
    </div>
  );
}
