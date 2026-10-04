import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const problems = await prisma.problem.findMany({
    where: { isPublic: true },
    orderBy: { id: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      timeLimitMs: true,
      memoryLimitMb: true,
      _count: { select: { testCases: true, submissions: true } },
    },
  });
  return NextResponse.json(problems);
}
