import { NextResponse } from "next/server";
import { computeScoreboard } from "@/lib/scoreboard";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const board = await computeScoreboard(params.slug);
    return NextResponse.json(board);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal menghitung scoreboard" },
      { status: 404 }
    );
  }
}
