import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const contest = await prisma.contest.findUnique({
    where: { slug: params.slug },
    include: {
      problems: {
        orderBy: { order: "asc" },
        include: {
          problem: {
            select: {
              slug: true,
              title: true,
              timeLimitMs: true,
              memoryLimitMb: true,
            },
          },
        },
      },
    },
  });
  if (!contest) {
    return NextResponse.json({ error: "Kontes tidak ditemukan" }, { status: 404 });
  }
  const now = Date.now();
  const status =
    now < new Date(contest.startsAt).getTime()
      ? "belum_mulai"
      : now > new Date(contest.endsAt).getTime()
        ? "berakhir"
        : "berlangsung";
  return NextResponse.json({ ...contest, status });
}
