/**
 * Perhitungan scoreboard kontes.
 * Ranking: soal terselesaikan (Accepted) terbanyak, lalu total waktu terkecil.
 * Total waktu = menit sejak mulai kontes hingga Accepted pertama per soal
 * + 20 menit penalti per submission salah sebelum Accepted.
 */
import { prisma } from "./prisma";

export const PENALTY_MINUTES = 20;

export interface ScoreboardRow {
  username: string;
  displayName: string;
  solved: number;
  totalTimeMinutes: number;
  perProblem: {
    problemSlug: string;
    solved: boolean;
    attempts: number;
    timeMinutes: number | null;
  }[];
}

export interface Scoreboard {
  frozen: boolean;
  computedAt: string;
  rows: ScoreboardRow[];
}

export async function computeScoreboard(contestSlug: string): Promise<Scoreboard> {
  const contest = await prisma.contest.findUnique({
    where: { slug: contestSlug },
    include: {
      problems: {
        orderBy: { order: "asc" },
        include: { problem: { select: { id: true, slug: true, title: true } } },
      },
    },
  });
  if (!contest) throw new Error("kontes tidak ditemukan");

  const start = new Date(contest.startsAt).getTime();
  const end = new Date(contest.endsAt).getTime();
  const now = Date.now();

  // Freeze: scoreboard dihitung hanya sampai (endsAt - freezeMinutes).
  let cutoff = end;
  let frozen = false;
  if (contest.freezeMinutes > 0 && now < end && now >= end - contest.freezeMinutes * 60000) {
    cutoff = end - contest.freezeMinutes * 60000;
    frozen = true;
  }

  const submissions = await prisma.submission.findMany({
    where: {
      contestId: contest.id,
      status: "judged",
      createdAt: { gte: new Date(Math.min(start, cutoff)), lte: new Date(cutoff) },
    },
    include: { user: { select: { username: true, displayName: true } } },
    orderBy: { createdAt: "asc" },
  });

  const users = new Map<string, { displayName: string; subs: typeof submissions }>();
  for (const s of submissions) {
    const key = s.user.username;
    if (!users.has(key)) users.set(key, { displayName: s.user.displayName, subs: [] });
    users.get(key)!.subs.push(s);
  }

  const problemIds = contest.problems.map((cp) => cp.problem.id);
  const rows: ScoreboardRow[] = [];

  for (const [username, { displayName, subs }] of users) {
    let solved = 0;
    let totalTime = 0;
    const perProblem = [];
    for (const cp of contest.problems) {
      const pid = cp.problem.id;
      const ps = subs
        .filter((s) => s.problemId === pid)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const ac = ps.find((s) => s.verdict === "accepted");
      const attempts = ps.length;
      if (ac) {
        solved += 1;
        const wrongBefore = ps.filter(
          (s) => s.createdAt.getTime() < ac.createdAt.getTime() && s.verdict !== "accepted"
        ).length;
        const timeMin = Math.floor((ac.createdAt.getTime() - start) / 60000);
        totalTime += timeMin + wrongBefore * PENALTY_MINUTES;
        perProblem.push({
          problemSlug: cp.problem.slug,
          solved: true,
          attempts,
          timeMinutes: timeMin,
        });
      } else {
        perProblem.push({ problemSlug: cp.problem.slug, solved: false, attempts, timeMinutes: null });
      }
    }
    rows.push({ username, displayName, solved, totalTimeMinutes: totalTime, perProblem });
  }

  rows.sort((a, b) => b.solved - a.solved || a.totalTimeMinutes - b.totalTimeMinutes);
  return { frozen, computedAt: new Date().toISOString(), rows };
}
