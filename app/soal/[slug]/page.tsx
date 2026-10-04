"use client";
import { useEffect, useState } from "react";
import { Navbar, SandboxBanner, VerdictBadge, fmtTime } from "../../components";

interface Sample { input: string; expectedOutput: string; position: number; }
interface ProblemDetail {
  slug: string; title: string; description: string;
  timeLimitMs: number; memoryLimitMb: number; testCases: Sample[];
}
interface SubmissionRow {
  id: number; language: string; status: string; verdict: string;
  createdAt: string; user: { username: string };
}

const TEMPLATE: Record<string, string> = {
  python: "a, b = map(int, input().split())\nprint(a + b)\n",
  javascript: "const fs = require('fs');\nconst [a, b] = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(a + b);\n",
};

export default function SoalPage({ params }: { params: { slug: string } }) {
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [username, setUsername] = useState("");
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(TEMPLATE.python);
  const [msg, setMsg] = useState("");
  const [history, setHistory] = useState<SubmissionRow[]>([]);

  const loadHistory = (u: string) => {
    if (!u.trim()) { setHistory([]); return; }
    fetch(`/api/submissions?username=${encodeURIComponent(u.trim())}&problemSlug=${params.slug}`)
      .then((r) => r.json()).then(setHistory).catch(() => {});
  };

  useEffect(() => {
    fetch(`/api/problems/${params.slug}`).then((r) => r.json()).then(setProblem).catch(() => {});
  }, [params.slug]);

  const switchLang = (lang: string) => {
    setLanguage(lang);
    setCode(TEMPLATE[lang] ?? "");
  };

  const submit = async () => {
    setMsg("");
    if (!username.trim()) { setMsg("Isi username dulu."); return; }
    if (!code.trim()) { setMsg("Kode tidak boleh kosong."); return; }
    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemSlug: params.slug, username: username.trim(), language, code }),
    });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error || "Gagal submit."); return; }
    setMsg(`Submission #${data.id} masuk antrean. Membuka halaman status…`);
    loadHistory(username);
    setTimeout(() => { window.location.href = `/submission/${data.id}`; }, 800);
  };

  if (!problem) return <div><Navbar /><main className="mx-auto max-w-5xl px-4 py-6">Memuat…</main></div>;

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <SandboxBanner />
        <div>
          <h1 className="text-2xl font-bold">{problem.title}</h1>
          <p className="mt-1 text-xs text-slate-500">
            Batas waktu: {problem.timeLimitMs} ms • Batas memori: {problem.memoryLimitMb} MB
          </p>
        </div>
        <section className="rounded border bg-white p-4">
          <h2 className="mb-2 font-semibold">Deskripsi</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{problem.description}</p>
        </section>
        <section className="rounded border bg-white p-4">
          <h2 className="mb-2 font-semibold">Contoh</h2>
          {problem.testCases.map((tc) => (
            <div key={tc.position} className="mb-3 grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-slate-500">Input contoh {tc.position}</div>
                <pre className="code rounded bg-slate-100 p-2 text-sm">{tc.input}</pre>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">Output contoh {tc.position}</div>
                <pre className="code rounded bg-slate-100 p-2 text-sm">{tc.expectedOutput}</pre>
              </div>
            </div>
          ))}
        </section>
        <section className="rounded border bg-white p-4">
          <h2 className="mb-3 font-semibold">Kirim Solusi</h2>
          <div className="mb-3 grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Username</span>
              <input
                className="w-full rounded border px-3 py-2"
                value={username}
                onChange={(e) => { setUsername(e.target.value); loadHistory(e.target.value); }}
                placeholder="mis. budi"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Bahasa</span>
              <select className="w-full rounded border px-3 py-2" value={language} onChange={(e) => switchLang(e.target.value)}>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Kode</span>
            <textarea
              className="code w-full rounded border p-3 font-mono text-sm"
              rows={12}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
            />
          </label>
          <button onClick={submit} className="mt-3 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Submit
          </button>
          {msg && <p className="mt-2 text-sm text-slate-700">{msg}</p>}
        </section>
        {history.length > 0 && (
          <section className="rounded border bg-white p-4">
            <h2 className="mb-2 font-semibold">Riwayat submission kamu untuk soal ini</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-500">
                <th className="py-1">#</th><th>Bahasa</th><th>Status</th><th>Waktu</th>
              </tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t">
                    <td className="py-1"><a className="text-blue-600 underline" href={`/submission/${h.id}`}>{h.id}</a></td>
                    <td>{h.language}</td>
                    <td><VerdictBadge verdict={h.status === "judged" ? h.verdict : h.status} /></td>
                    <td className="text-xs text-slate-500">{fmtTime(h.createdAt)}</td>
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
