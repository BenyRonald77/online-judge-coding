import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSupportedLanguage } from "@/lib/judge";
import { SANDBOX_MODE } from "@/lib/runner";

/** Submit solusi kode → masuk antrean (status queued). */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const problemSlug = body?.problemSlug?.toString().trim();
  const username = body?.username?.toString().trim();
  const language = body?.language?.toString().trim();
  const code = body?.code?.toString();
  const contestSlug = body?.contestSlug?.toString().trim() || null;

  if (!problemSlug || !username || !language || !code?.trim()) {
    return NextResponse.json(
      { error: "problemSlug, username, language, dan code wajib diisi" },
      { status: 400 }
    );
  }
  if (!isSupportedLanguage(language)) {
    return NextResponse.json(
      { error: `Bahasa tidak didukung: ${language}. Pilih python atau javascript` },
      { status: 400 }
    );
  }

  const problem = await prisma.problem.findUnique({ where: { slug: problemSlug } });
  if (!problem || !problem.isPublic) {
    return NextResponse.json({ error: "Soal tidak ditemukan" }, { status: 404 });
  }

  let contestId: number | null = null;
  if (contestSlug) {
    const contest = await prisma.contest.findUnique({
      where: { slug: contestSlug },
      include: { problems: true },
    });
    if (!contest) {
      return NextResponse.json({ error: "Kontes tidak ditemukan" }, { status: 404 });
    }
    const now = Date.now();
    const start = new Date(contest.startsAt).getTime();
    const end = new Date(contest.endsAt).getTime();
    if (now < start) {
      return NextResponse.json({ error: "Kontes belum dimulai" }, { status: 422 });
    }
    if (now > end) {
      return NextResponse.json({ error: "Kontes sudah berakhir" }, { status: 422 });
    }
    if (!contest.problems.some((cp) => cp.problemId === problem.id)) {
      return NextResponse.json(
        { error: "Soal ini tidak termasuk dalam kontes tersebut" },
        { status: 422 }
      );
    }
    contestId = contest.id;
  }

  const user = await prisma.user.upsert({
    where: { username },
    update: {},
    create: { username, displayName: username },
  });

  const submission = await prisma.submission.create({
    data: {
      problemId: problem.id,
      userId: user.id,
      contestId,
      language,
      code,
      status: "queued",
      verdict: "pending",
    },
    select: { id: true, status: true, verdict: true, createdAt: true },
  });

  return NextResponse.json(
    { ...submission, sandboxMode: SANDBOX_MODE },
    { status: 201 }
  );
}

/** Riwayat submission (opsional filter username & problemSlug). */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username")?.trim() || undefined;
  const problemSlug = searchParams.get("problemSlug")?.trim() || undefined;

  const rows = await prisma.submission.findMany({
    where: {
      user: username ? { username } : undefined,
      problem: problemSlug ? { slug: problemSlug } : undefined,
    },
    orderBy: { id: "desc" },
    take: 100,
    select: {
      id: true,
      language: true,
      status: true,
      verdict: true,
      maxTimeMs: true,
      createdAt: true,
      judgedAt: true,
      contestId: true,
      user: { select: { username: true, displayName: true } },
      problem: { select: { slug: true, title: true } },
    },
  });
  return NextResponse.json(rows);
}
