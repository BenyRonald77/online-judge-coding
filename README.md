# Online Judge untuk Latihan Coding

Platform online judge sederhana: peserta mengirim solusi kode (Python / JavaScript),
sistem mengeksekusi kode terhadap test case tersembunyi, lalu memberikan verdict
(Accepted / Wrong Answer / Time Limit Exceeded / Runtime Error / Compile Error).
Mendukung mode kontes dengan scoreboard dan riwayat submission.

> **Mode non-Docker (tidak terisolasi penuh).** Docker tidak tersedia di lingkungan
> ini, sehingga kode submission dijalankan langsung di host via `child_process.spawn`
> dengan batas timeout ketat per test case. Batas memori tidak ditegakkan dan akses
> jaringan/filesystem tidak diblokir — hanya untuk latihan internal/tepercaya.
> Lihat PRD.md bagian 3. Semua verdict berasal dari eksekusi nyata, tidak di-hardcode.

## Cara Menjalankan

```bash
npm install --ignore-scripts
# workaround VM: salin prisma engines manual (download selalu gagal)
cp ~/workspace/ts-convert/prisma-engines/* node_modules/@prisma/engines/
cp .env.example .env
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

## Halaman

- `/` — dashboard: daftar soal & kontes
- `/soal/[slug]` — deskripsi soal, contoh, form submit, riwayat submission
- `/submission/[id]` — status & verdict per test case (auto-refresh)
- `/kontes` — daftar kontes
- `/kontes/[slug]` — soal kontes & scoreboard

## API

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | /api/problems | daftar soal |
| GET | /api/problems/[slug] | detail soal + test case sample saja |
| POST | /api/submissions | submit kode → `queued` |
| GET | /api/submissions | riwayat (`?username=&problemSlug=`) |
| GET | /api/submissions/[id] | detail verdict per test case |
| POST | /api/worker/run | proses 1 submission FIFO |
| GET | /api/worker/queue | info antrean |
| GET | /api/contests | daftar kontes |
| GET | /api/contests/[slug] | detail kontes |
| GET | /api/contests/[slug]/scoreboard | ranking (solved, penalti 20 mnt) |

## Menjalankan worker

Antrean diproses oleh worker — panggil berulang, mis. tiap beberapa detik via cron:

```bash
curl -X POST http://localhost:3000/api/worker/run
```

## Aturan bisnis penting

- Test case tersembunyi tidak pernah dikirim ke klien (API maupun UI).
- Submit ke kontes yang belum mulai / sudah berakhir → 422.
- Verdict final = verdict gagal pertama sesuai urutan test case, atau Accepted.
- Klaim antrean worker atomik (conditional `updateMany` + cek row terpengaruh).
