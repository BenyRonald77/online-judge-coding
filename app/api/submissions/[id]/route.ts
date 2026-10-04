import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Detail submission + verdict per test case.
 *  Untuk test case tersembunyi hanya verdict & waktu yang dikembalikan
 *  (input/expected TIDAK PERNAH dikirim ke klien). */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }
  const sub = await prisma.submission.findUnique({
    where: { id },
    include: {
      user: { select: { username: true, displayName: true } },
      problem: { select: { slug: true, title: true, timeLimitMs: true } },
      results: {
        orderBy: { id: "asc" },
        include: {
          testCase: { select: { position: true, isSample: true, input: true, expectedOutput: true } },
        },
      },
    },
  });
  if (!sub) {
    return NextResponse.json({ error: "Submission tidak ditemukan" }, { status: 404 });
  }

  const results = sub.results.map((r) => ({
    position: r.testCase.position,
    isSample: r.testCase.isSample,
    verdict: r.verdict,
    timeMs: r.timeMs,
    message: r.message,
    // input/expected hanya untuk sample; yang tersembunyi disembunyikan
    ...(r.testCase.isSample
      ? { input: r.testCase.input, expectedOutput: r.testCase.expectedOutput }
      : {}),
  }));

  return NextResponse.json({
    id: sub.id,
    language: sub.language,
    status: sub.status,
    verdict: sub.verdict,
    maxTimeMs: sub.maxTimeMs,
    judgeLog: sub.judgeLog,
    createdAt: sub.createdAt,
    judgedAt: sub.judgedAt,
    contestId: sub.contestId,
    user: sub.user,
    problem: sub.problem,
    results,
  });
}
