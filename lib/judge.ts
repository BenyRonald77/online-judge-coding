/**
 * Logika worker: klaim atomik submission tertua dari antrean (FIFO),
 * eksekusi per test case via runner, dan penetapan verdict final.
 */
import { prisma } from "./prisma";
import {
  Language,
  SUPPORTED_LANGUAGES,
  checkCompile,
  normalizeOutput,
  runCode,
} from "./runner";

export function isSupportedLanguage(lang: string): lang is Language {
  return (SUPPORTED_LANGUAGES as string[]).includes(lang);
}

/**
 * Klaim submission `queued` tertua secara atomik.
 * Pola: ambil kandidat tertua, lalu conditional updateMany (status masih
 * `queued`) + cek row terpengaruh. Aman untuk worker konkuren di SQLite
 * (tidak mengandalkan interactive transaction untuk atomicity).
 */
export async function claimNextQueued(): Promise<number | null> {
  const next = await prisma.submission.findFirst({
    where: { status: "queued" },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (!next) return null;
  const claimed = await prisma.submission.updateMany({
    where: { id: next.id, status: "queued" },
    data: { status: "running" },
  });
  return claimed.count === 1 ? next.id : null;
}

/** Nilai satu submission penuh. Mengembalikan id submission yang dinilai. */
export async function judgeSubmission(id: number): Promise<void> {
  const sub = await prisma.submission.findUnique({
    where: { id },
    include: {
      problem: { include: { testCases: { orderBy: { position: "asc" } } } },
    },
  });
  if (!sub) throw new Error(`submission ${id} tidak ditemukan`);
  if (sub.status === "judged") return;

  const language = sub.language as Language;
  const timeLimit = sub.problem.timeLimitMs;

  // 1. Compile check — gagal = compile_error tanpa menjalankan test case.
  const compile = await checkCompile(language, sub.code);
  if (!compile.ok) {
    await prisma.submission.update({
      where: { id },
      data: {
        status: "judged",
        verdict: "compile_error",
        judgedAt: new Date(),
        judgeLog: compile.message ?? "compile error",
      },
    });
    return;
  }

  // 2. Jalankan tiap test case (termasuk yang tersembunyi) secara nyata.
  type Judgeable = "accepted" | "wrong_answer" | "time_limit_exceeded" | "runtime_error";
  let finalVerdict: Judgeable = "accepted";
  let maxTime = 0;
  for (const tc of sub.problem.testCases) {
    const run = await runCode(language, sub.code, tc.input, timeLimit);
    maxTime = Math.max(maxTime, run.timeMs);
    let caseVerdict: Judgeable;
    if (run.verdict !== "accepted") {
      caseVerdict = run.verdict; // time_limit_exceeded | runtime_error
    } else if (normalizeOutput(run.stdout) !== normalizeOutput(tc.expectedOutput)) {
      caseVerdict = "wrong_answer";
    } else {
      caseVerdict = "accepted";
    }
    await prisma.testResult.create({
      data: {
        submissionId: id,
        testCaseId: tc.id,
        verdict: caseVerdict,
        timeMs: run.timeMs,
        message:
          caseVerdict === "runtime_error"
            ? run.stderr.slice(0, 500) || undefined
            : undefined,
      },
    });
    if (finalVerdict === "accepted" && caseVerdict !== "accepted") {
      finalVerdict = caseVerdict; // verdict gagal PERTAMA sesuai urutan test case
    }
  }

  await prisma.submission.update({
    where: { id },
    data: {
      status: "judged",
      verdict: finalVerdict,
      judgedAt: new Date(),
      maxTimeMs: maxTime,
    },
  });
}

/** Proses satu item antrean (dipakai endpoint worker). */
export async function processOneQueued(): Promise<{
  processed: boolean;
  submissionId?: number;
  verdict?: string;
}> {
  const id = await claimNextQueued();
  if (id === null) return { processed: false };
  await judgeSubmission(id);
  const sub = await prisma.submission.findUnique({
    where: { id },
    select: { verdict: true },
  });
  return { processed: true, submissionId: id, verdict: sub?.verdict };
}
