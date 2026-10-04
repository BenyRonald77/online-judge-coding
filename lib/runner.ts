/**
 * Runner abstraction untuk mengeksekusi kode submission.
 *
 * MODE SANDBOX:
 * - "docker"     : kode dijalankan di container terisolasi
 *                   (docker run --rm --network none --memory ... --cpus ...).
 * - "non-docker" : Docker tidak tersedia di lingkungan ini, sehingga kode
 *                   dijalankan langsung di host via child_process.spawn dengan
 *                   batas TIMEOUT KETAT per test case. Mode ini JELAS-JELAS
 *                   BUKAN isolasi penuh:
 *                     - batas memori TIDAK ditegakkan (hanya timeout),
 *                     - akses network/filesystem host TIDAK diblokir,
 *                     - hanya cocok untuk latihan internal/tepercaya.
 *
 * Apa pun modenya, verdict SELALU berasal dari eksekusi nyata kode peserta
 * (tidak pernah di-hardcode).
 */
import { spawn } from "child_process";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export const SANDBOX_MODE: "docker" | "non-docker" = "non-docker";

export type Language = "python" | "javascript";
export type CaseVerdict =
  | "accepted"
  | "wrong_answer"
  | "time_limit_exceeded"
  | "runtime_error"
  | "compile_error";

export const SUPPORTED_LANGUAGES: Language[] = ["python", "javascript"];

export interface RunResult {
  // runCode tidak pernah mengembalikan compile_error (cek kompilasi terpisah)
  verdict: "accepted" | "time_limit_exceeded" | "runtime_error";
  timeMs: number;
  stdout: string;
  stderr: string;
}

function langConfig(language: Language): { ext: string; cmd: string; args: string[] } {
  if (language === "python") return { ext: "py", cmd: "python3", args: [] };
  return { ext: "js", cmd: "node", args: [] };
}

/** Cek kompilasi/sintaks sebelum menjalankan test case. */
export async function checkCompile(
  language: Language,
  code: string
): Promise<{ ok: boolean; message?: string }> {
  const { ext, cmd } = langConfig(language);
  const dir = mkdtempSync(join(tmpdir(), "oj-compile-"));
  try {
    const file = join(dir, `solution.${ext}`);
    writeFileSync(file, code, "utf8");
    const args = language === "python" ? ["-m", "py_compile", file] : ["--check", file];
    const res = await spawnOnce(cmd, args, "", 10000, dir);
    if (res.exitCode === 0) return { ok: true };
    return { ok: false, message: (res.stderr || res.stdout || "compile error").slice(0, 2000) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

interface SpawnResult {
  exitCode: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  timeMs: number;
}

function spawnOnce(
  cmd: string,
  args: string[],
  stdin: string,
  timeoutMs: number,
  cwd: string
): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const started = Date.now();
    let timedOut = false;
    let stdout = "";
    let stderr = "";
    let child;
    try {
      child = spawn(cmd, args, { cwd, stdio: ["pipe", "pipe", "pipe"] });
    } catch (e) {
      resolve({
        exitCode: null,
        signal: null,
        stdout: "",
        stderr: String(e).slice(0, 2000),
        timedOut: false,
        timeMs: Date.now() - started,
      });
      return;
    }
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    // Pengaman: batasi output agar tidak membanjiri memori (10 MB).
    const MAX_OUT = 10 * 1024 * 1024;
    child.stdout.on("data", (d: Buffer) => {
      if (stdout.length < MAX_OUT) stdout += d.toString("utf8");
    });
    child.stderr.on("data", (d: Buffer) => {
      if (stderr.length < MAX_OUT) stderr += d.toString("utf8");
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        exitCode: null,
        signal: null,
        stdout,
        stderr: String(err).slice(0, 2000),
        timedOut: false,
        timeMs: Date.now() - started,
      });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({
        exitCode: code,
        signal,
        stdout,
        stderr,
        timedOut,
        timeMs: Date.now() - started,
      });
    });
    try {
      child.stdin.write(stdin);
      child.stdin.end();
    } catch {
      /* abaikan */
    }
  });
}

/** Jalankan kode terhadap satu test case dengan batas timeout ketat. */
export async function runCode(
  language: Language,
  code: string,
  input: string,
  timeoutMs: number
): Promise<RunResult> {
  const { ext, cmd, args } = langConfig(language);
  const dir = mkdtempSync(join(tmpdir(), "oj-run-"));
  try {
    const file = join(dir, `solution.${ext}`);
    writeFileSync(file, code, "utf8");
    const res = await spawnOnce(cmd, [...args, file], input, timeoutMs, dir);
    if (res.timedOut) {
      return { verdict: "time_limit_exceeded", timeMs: res.timeMs, stdout: "", stderr: "" };
    }
    if (res.exitCode !== 0) {
      return {
        verdict: "runtime_error",
        timeMs: res.timeMs,
        stdout: res.stdout.slice(0, 2000),
        stderr: res.stderr.slice(0, 2000),
      };
    }
    return { verdict: "accepted", timeMs: res.timeMs, stdout: res.stdout, stderr: "" };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Normalisasi output untuk perbandingan: abaikan perbedaan \r\n dan
 *  spasi di akhir baris. */
export function normalizeOutput(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();
}

export function verdictLabel(v: string): string {
  const map: Record<string, string> = {
    pending: "Menunggu",
    queued: "Antre",
    running: "Diproses",
    judged: "Dinilai",
    accepted: "Accepted",
    wrong_answer: "Wrong Answer",
    time_limit_exceeded: "Time Limit Exceeded",
    runtime_error: "Runtime Error",
    compile_error: "Compile Error",
  };
  return map[v] ?? v;
}
