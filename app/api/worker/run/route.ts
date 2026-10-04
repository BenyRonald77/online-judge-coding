import { NextResponse } from "next/server";
import { processOneQueued } from "@/lib/judge";
import { SANDBOX_MODE } from "@/lib/runner";

/**
 * Worker: ambil submission `queued` tertua (FIFO, klaim atomik),
 * jalankan, dan simpan verdict. Dipanggil berulang (mis. via cron)
 * atau manual untuk memproses antrean.
 */
export async function POST() {
  try {
    const result = await processOneQueued();
    return NextResponse.json({ ...result, sandboxMode: SANDBOX_MODE });
  } catch (e) {
    return NextResponse.json(
      { error: `Worker gagal: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
