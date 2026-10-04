import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const n = await prisma.problem.count();
  if (n > 0) {
    console.log("seed dilewati (sudah ada data)");
    return;
  }

  const budi = await prisma.user.create({
    data: { username: "budi", displayName: "Budi" },
  });

  const aplu = await prisma.problem.create({
    data: {
      slug: "a-plus-b",
      title: "A+B Sederhana",
      description:
        "Diberikan dua bilangan bulat A dan B dalam satu baris, dipisahkan spasi. Cetak hasil A+B.",
      timeLimitMs: 2000,
      testCases: {
        create: [
          { input: "3 4", expectedOutput: "7", isSample: true, position: 1 },
          { input: "10 20", expectedOutput: "30", isSample: true, position: 2 },
          { input: "0 0", expectedOutput: "0", isSample: false, position: 3 },
          { input: "1000000 1000000", expectedOutput: "2000000", isSample: false, position: 4 },
          { input: "-5 12", expectedOutput: "7", isSample: false, position: 5 },
        ],
      },
    },
  });

  const pal = await prisma.problem.create({
    data: {
      slug: "palindrom",
      title: "Palindrom",
      description:
        "Diberikan sebuah string S (satu baris, huruf kecil tanpa spasi). Cetak YA jika S adalah palindrom, selain itu cetak TIDAK.",
      timeLimitMs: 2000,
      testCases: {
        create: [
          { input: "katak", expectedOutput: "YA", isSample: true, position: 1 },
          { input: "rumah", expectedOutput: "TIDAK", isSample: true, position: 2 },
          { input: "a", expectedOutput: "YA", isSample: false, position: 3 },
          { input: "abba", expectedOutput: "YA", isSample: false, position: 4 },
          { input: "abcba", expectedOutput: "YA", isSample: false, position: 5 },
          { input: "abca", expectedOutput: "TIDAK", isSample: false, position: 6 },
        ],
      },
    },
  });

  await prisma.problem.create({
    data: {
      slug: "fibonacci",
      title: "Fibonacci",
      description:
        "Diberikan bilangan bulat N (0 ≤ N ≤ 35). Cetak bilangan Fibonacci ke-N (F(0)=0, F(1)=1).",
      timeLimitMs: 2000,
      testCases: {
        create: [
          { input: "0", expectedOutput: "0", isSample: true, position: 1 },
          { input: "1", expectedOutput: "1", isSample: true, position: 2 },
          { input: "10", expectedOutput: "55", isSample: true, position: 3 },
          { input: "2", expectedOutput: "1", isSample: false, position: 4 },
          { input: "5", expectedOutput: "5", isSample: false, position: 5 },
          { input: "20", expectedOutput: "6765", isSample: false, position: 6 },
          { input: "30", expectedOutput: "832040", isSample: false, position: 7 },
        ],
      },
    },
  });

  const now = Date.now();
  await prisma.contest.create({
    data: {
      name: "Kontes Pemanasan",
      slug: "kontes-pemanasan",
      startsAt: new Date(now - 60 * 60 * 1000).toISOString(),
      endsAt: new Date(now + 23 * 60 * 60 * 1000).toISOString(),
      freezeMinutes: 0,
      problems: {
        create: [
          { problemId: aplu.id, order: 1 },
          { problemId: pal.id, order: 2 },
        ],
      },
    },
  });

  console.log(`seed selesai: 3 soal, 1 kontes, user contoh: ${budi.username}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
