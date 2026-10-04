import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const contests = await prisma.contest.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      startsAt: true,
      endsAt: true,
      freezeMinutes: true,
      _count: { select: { problems: true } },
    },
  });
  return NextResponse.json(contests);
}
