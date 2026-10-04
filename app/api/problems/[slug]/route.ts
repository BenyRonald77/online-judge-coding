import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const problem = await prisma.problem.findUnique({
    where: { slug: params.slug },
    include: {
      // HANYA test case sample yang dikembalikan — test case tersembunyi
      // tidak pernah terekspos ke peserta via API.
      testCases: {
        where: { isSample: true },
        orderBy: { position: "asc" },
        select: { input: true, expectedOutput: true, position: true },
      },
    },
  });
  if (!problem || !problem.isPublic) {
    return NextResponse.json({ error: "Soal tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json(problem);
}
