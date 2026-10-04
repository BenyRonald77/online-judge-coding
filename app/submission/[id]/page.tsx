"use client";
import { useEffect, useState } from "react";
import { Navbar, SandboxBanner, VerdictBadge, fmtTime } from "../../components";

interface CaseRow {
  position: number; isSample: boolean; verdict: string; timeMs: number;
  message?: string; input?: string; expectedOutput?: string;
}
interface Detail {
  id: number; language: string; status: string; verdict: string;
  maxTimeMs: number; judgeLog?: string; createdAt: string; judgedAt?: string;
  user: { username: string }; problem: { slug: string; title: string };
  results: CaseRow[];
}

export default function SubmissionPage({ params }: { params: { id: string } }) {
  const [detail, setDetail] = useState<Detail | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const res = await fetch(`/api/submissions/${params.id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (alive) setDetail(data);
      return data.status;
    };
    load().then((status) => {
      if (status === "queued" || status === "running") {
        const t = setInterval(async () => {
          const s = await load();
          if (s !== "queued" && s !== "running") clearInterval(t);
        }, 1500);
        return () => clearInterval(t);
      }
    });
    return () => { alive = false; };
  }, [params.id]);

  if (!detail) return <div><Navbar /><main className="mx-auto max-w-5xl px-4 py-6">Memuat…</main></div>;

  const done = detail.status === "judged";
  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <SandboxBanner />
        <div>
          <h1 className="text-2xl font-bold">Submission #{detail.id}</h1>
          <p className="mt-1 text-sm text-slate-600">
            <a className="text-blue-600 underline" href={`/soal/${detail.problem.slug}`}>{detail.problem.title}</a>
            {" "}• {detail.user.username} • {detail.language} • {fmtTime(detail.createdAt)}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <VerdictBadge verdict={done ? detail.verdict : detail.status} />
            {done && <span className="text-xs text-slate-500">waktu maks {detail.maxTimeMs} ms</span>}
            {!done && <span className="text-xs text-slate-500">Menunggu worker memproses antrean… (refresh otomatis)</span>}
          </div>
        </div>
        {done && detail.judgeLog && (
          <section className="rounded border bg-white p-4">
            <h2 className="mb-2 font-semibold">Log</h2>
            <pre className="code rounded bg-slate-100 p-2 text-xs">{detail.judgeLog}</pre>
          </section>
        )}
        {done && (
          <section className="rounded border bg-white p-4">
            <h2 className="mb-2 font-semibold">Hasil per test case</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-500">
                <th className="py-1">#</th><th>Jenis</th><th>Verdict</th><th>Waktu</th><th>Detail</th>
              </tr></thead>
              <tbody>
                {detail.results.map((r) => (
                  <tr key={r.position} className="border-t align-top">
                    <td className="py-1">{r.position}</td>
                    <td>{r.isSample ? "Contoh" : "Tersembunyi"}</td>
                    <td><VerdictBadge verdict={r.verdict} /></td>
                    <td>{r.timeMs} ms</td>
                    <td className="max-w-xs">
                      {r.isSample && r.input !== undefined && (
                        <pre className="code text-xs text-slate-600">in: {r.input} → out: {r.expectedOutput}</pre>
                      )}
                      {!r.isSample && <span className="text-xs italic text-slate-400">data disembunyikan</span>}
                      {r.message && <pre className="code mt-1 text-xs text-red-700">{r.message}</pre>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}
