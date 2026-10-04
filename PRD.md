# PRD — Online Judge untuk Latihan Coding

## 1. Ringkasan
Platform online judge sederhana untuk latihan coding: peserta mengirim solusi
kode untuk soal-soal pemrograman, sistem mengeksekusi kode terhadap test case
tersembunyi, lalu memberikan verdict (Accepted / Wrong Answer / Time Limit
Exceeded / Runtime Error / Compile Error). Mendukung mode kontes dengan
scoreboard dan riwayat submission per user.

## 2. Stack
- Next.js 14 (App Router) + TypeScript + Prisma 5.22 + SQLite + Tailwind
- Bahasa solusi yang didukung: **Python** (`python3`) dan **JavaScript** (`node`)
- UI berbahasa Indonesia

## 3. Mode Sandbox (keterbatasan jujur)
- **Docker TIDAK tersedia di lingkungan ini** (`docker` tidak terinstal di VM).
- Maka dipakai **mode non-Docker**: kode submission dieksekusi langsung di host
  via `child_process.spawn` dengan:
  - batas **timeout per test case** yang ketat (default 2000 ms, per-soal bisa diatur),
  - working directory sementara per submission,
  - proses di-`kill` paksa saat timeout (verdict TLE),
  - penanda jelas di UI (banner) dan di respons API (`sandboxMode: "non-docker"`).
- **Batasan mode non-Docker (didokumentasikan, bukan disembunyikan):**
  - Tidak ada isolasi penuh (tanpa namespace/cgroup/container): kode berjalan
    dengan hak akses user yang menjalankan server.
  - Batas memori per test case **tidak ditegakkan** di mode ini (hanya timeout).
  - Akses network/filesystem host **tidak diblokir**.
  - Cocok untuk latihan internal/tepercaya, BUKAN untuk kontes publik terbuka.
- Jika Docker tersedia di deployment lain, arsitektur runner (`lib/runner.ts`)
  dirancang sebagai abstraksi: cukup ganti `runInSandbox()` dengan eksekusi
  `docker run --rm --network none --memory ... --cpus ...`, tanpa mengubah API.
- **Verdict TIDAK PERNAH di-hardcode**: Accepted/WA/TLE/RE/CE selalu berasal
  dari hasil eksekusi nyata kode peserta.

## 4. Model Data
- **User** — `id`, `username` (unik), `displayName`. (Tanpa autentikasi: username
  dibuat otomatis saat submit pertama.)
- **Problem** — `id`, `slug` (unik), `title`, `description`, `timeLimitMs`
  (default 2000), `memoryLimitMb` (default 256, dokumentatif di mode non-Docker),
  `isPublic`.
- **TestCase** — `id`, `problemId`, `input`, `expectedOutput`, `isSample`,
  `position`. Test case non-sample **tersembunyi**: tidak pernah dikirim ke
  klien via API mana pun.
- **Submission** — `id`, `problemId`, `userId`, `contestId?`, `language`
  (`python` | `javascript`), `code`, `status` (`queued` | `running` | `judged`),
  `verdict` (`pending` | `accepted` | `wrong_answer` | `time_limit_exceeded` |
  `runtime_error` | `compile_error`), `createdAt`, `judgedAt?`, `maxTimeMs`.
- **TestResult** — `id`, `submissionId`, `testCaseId`, `verdict`, `timeMs`,
  `message?`. Untuk test case tersembunyi, API hanya mengembalikan verdict dan
  waktu — **bukan input/expected**.
- **Contest** — `id`, `name`, `slug` (unik), `startsAt`, `endsAt`
  (ISO text), `freezeMinutes` (default 0 = tanpa freeze).
- **ContestProblem** — `contestId`, `problemId`, `points?`, `order`.

## 5. Fungsionalitas

### F1 — Manajemen Soal & Test Case (API)
- `GET /api/problems` — daftar soal publik (tanpa test case).
- `GET /api/problems/[slug]` — detail soal + **hanya test case sample**.
- Test case tersembunyi tidak terekspos di endpoint mana pun (uji: respons
  tidak mengandung field input/expected untuk non-sample).

### F2 — Submission, Antrean & Worker
- `POST /api/submissions` — body: `problemSlug`, `username`, `language`, `code`,
  opsional `contestSlug`.
  - Validasi: 400 (field kosong / bahasa tak didukung / soal tak ada).
  - Jika `contestSlug` diisi: kontes harus ada (404); jika kontes belum mulai
    atau sudah berakhir → **422**; submission tercatat dengan `contestId`.
  - Submission baru berstatus `queued` (masuk antrean).
- `GET /api/submissions?username=&problemSlug=` — riwayat submission
  (tanpa isi test case tersembunyi).
- `GET /api/submissions/[id]` — detail + hasil per test case (verdict/waktu
  saja untuk yang tersembunyi).
- `POST /api/worker/run` — worker mengambil submission `queued` tertua
  (**klaim atomik**: `updateMany` kondisional `status=queued` + cek row
  terpengaruh; FIFO), mengeksekusinya per test case via runner, menyimpan
  `TestResult`, lalu verdict final:
  - Compile check dulu (Python: `py_compile`; JS: `node --check`) → gagal =
    `compile_error` tanpa menjalankan test case.
  - Per test case: `accepted` | `wrong_answer` | `time_limit_exceeded` |
    `runtime_error`.
  - Verdict final = verdict gagal pertama sesuai urutan test case, atau
    `accepted` bila semua lolos.
- `GET /api/worker/queue` — jumlah antrean + status worker.

### F3 — Kontes & Scoreboard
- `GET /api/contests` — daftar kontes.
- `GET /api/contests/[slug]` — detail kontes + daftar soal kontes.
- `GET /api/contests/[slug]/scoreboard` — ranking:
  - Urut: jumlah soal terselesaikan (Accepted) terbanyak, lalu total waktu
    terkecil (menit sejak mulai kontes hingga Accepted pertama per soal +
    **20 menit penalti per submission salah** sebelum Accepted).
  - Hanya submission dalam rentang waktu kontes yang dihitung.
  - Freeze: jika `freezeMinutes > 0` dan sekarang berada dalam jendela freeze
    sebelum `endsAt`, scoreboard dihitung sampai titik freeze dan diberi tanda
    `frozen: true`.

### F4 — UI (Bahasa Indonesia)
- `/` — dashboard: daftar soal, daftar kontes, banner mode non-Docker.
- `/soal/[slug]` — deskripsi soal, contoh input/output, form submit
  (username, bahasa, kode) + riwayat submission user untuk soal itu.
- `/submission/[id]` — status & verdict per test case, auto-refresh saat
  masih queued/running.
- `/kontes` — daftar kontes; `/kontes/[slug]` — soal kontes + scoreboard.
- Polling sederhana (bukan WebSocket) untuk status submission — jujur & testable.

## 6. Seed
- 3 soal: **A+B Sederhana** (input `3 4` → `7`), **Palindrom**
  (`katak` → `YA`), **Fibonacci** (`10` → `55`); masing-masing punya
  sample + test case tersembunyi.
- 1 kontes contoh: "Kontes Pemanasan" (berlangsung saat seed: mulai 1 jam lalu,
  berakhir 23 jam lagi) berisi 2 soal pertama.
- 1 user contoh: `budi`.

## 7. API Ringkas
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | /api/problems | daftar soal |
| GET | /api/problems/[slug] | detail soal + sample |
| POST | /api/submissions | submit (→ queued) |
| GET | /api/submissions | riwayat |
| GET | /api/submissions/[id] | detail verdict |
| POST | /api/worker/run | proses 1 submission FIFO |
| GET | /api/worker/queue | info antrean |
| GET | /api/contests | daftar kontes |
| GET | /api/contests/[slug] | detail kontes |
| GET | /api/contests/[slug]/scoreboard | ranking |

## 8. Kriteria Uji (curl)
1. Submit solusi benar → setelah worker: `accepted`.
2. Submit solusi salah → `wrong_answer`.
3. Infinite loop → `time_limit_exceeded`.
4. Submit ke kontes yang belum mulai / sudah berakhir → 422.
5. Respons API tidak pernah memuat test case tersembunyi.
6. Scoreboard: ranking benar (solved desc, penalti 20 mnt/submission salah).
7. Worker FIFO: dua submission queued diproses berurutan (id terkecil dulu).
8. `npm run build` lolos.
