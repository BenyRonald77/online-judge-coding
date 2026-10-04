"use client";

export function verdictColor(v: string): string {
  switch (v) {
    case "accepted": return "bg-green-100 text-green-800";
    case "wrong_answer": return "bg-red-100 text-red-800";
    case "time_limit_exceeded": return "bg-amber-100 text-amber-800";
    case "runtime_error": return "bg-orange-100 text-orange-800";
    case "compile_error": return "bg-purple-100 text-purple-800";
    case "queued": return "bg-slate-200 text-slate-700";
    case "running": return "bg-blue-100 text-blue-800";
    default: return "bg-slate-100 text-slate-600";
  }
}

export function verdictLabel(v: string): string {
  const map: Record<string, string> = {
    pending: "Menunggu", queued: "Antre", running: "Diproses", judged: "Dinilai",
    accepted: "Accepted", wrong_answer: "Wrong Answer",
    time_limit_exceeded: "Time Limit Exceeded", runtime_error: "Runtime Error",
    compile_error: "Compile Error",
  };
  return map[v] ?? v;
}

export function VerdictBadge({ verdict }: { verdict: string }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${verdictColor(verdict)}`}>
      {verdictLabel(verdict)}
    </span>
  );
}

export function Navbar() {
  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <a href="/" className="text-lg font-bold text-slate-900">⚖️ Online Judge</a>
        <a href="/" className="text-sm text-slate-600 hover:text-slate-900">Soal</a>
        <a href="/kontes" className="text-sm text-slate-600 hover:text-slate-900">Kontes</a>
      </div>
    </nav>
  );
}

export function SandboxBanner() {
  return (
    <div className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <strong>Mode non-Docker (tidak terisolasi penuh).</strong> Kode submission
      dijalankan langsung di server dengan batas waktu ketat per test case.
      Batas memori tidak ditegakkan dan akses jaringan/filesystem tidak diblokir —
      hanya untuk latihan internal/tepercaya.
    </div>
  );
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("id-ID");
}
