import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SANDBOX_MODE } from "@/lib/runner";

/** Info antrean worker. */
export async function GET() {
  const [queued, running] = await Promise.all([
    prisma.submission.count({ where: { status: "queued" } }),
    prisma.submission.count({ where: { status: "running" } }),
  ]);
  return NextResponse.json({ queued, running, sandboxMode: SANDBOX_MODE });
}
