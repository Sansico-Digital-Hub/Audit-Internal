# Audit Internal Produksi

Aplikasi audit internal proses produksi (17 area + 8 unit departemen). Skor seksi = `M / (M + DM) x bobot`, standar 95, warning 85.

Dibangun dengan **Next.js (App Router) sebagai frontend sekaligus backend**, **PostgreSQL + Drizzle ORM**, **PWA** (installable, cache offline), responsif untuk mobile dan desktop.

Folder `referensi/` berisi versi lama (single-file HTML) sebagai acuan data dan perilaku.

## Fitur

- Form audit Produksi (39 poin, 4 seksi) dan Departemen (8 unit, kategori berbobot)
- Penilaian M / DM / N-A; poin DM wajib keterangan + foto bukti (maks 4, dikompres di browser)
- Dashboard produksi & departemen: KPI, heatmap area/unit, grafik tren mingguan/bulanan, capaian komponen, poin paling sering temuan
- Tindak lanjut temuan: action plan, PIC, due date, status, foto bukti sebelum Closed
- Riwayat audit + detail, plus ekspor CSV (skor & temuan)
- Poin checklist tambahan (T1, T2, ...) yang bisa diaktifkan/nonaktifkan admin
- 3 peran via PIN: Produksi/Departemen, Auditor, Admin
- Auto-refresh data tiap 30 detik; PWA installable + fallback offline

## Arsitektur

| Bagian | Teknologi |
| --- | --- |
| UI + API | Next.js App Router (Route Handlers `src/app/api/*`) |
| Database | PostgreSQL 16 + Drizzle ORM (`src/lib/db`) |
| Auth | PIN (bcrypt) + sesi JWT di cookie httpOnly (`jose`) |
| Foto | binary `bytea` di tabel `photos`, disajikan lewat `/api/photos/[id]` |
| PWA | `public/manifest.webmanifest` + `public/sw.js` (service worker) |

Skema: `config` (access/areas/customitems), `audits`, `dept_audits`, `photos`.

## Pengembangan lokal

```bash
# 1. Pastikan PostgreSQL jalan, buat database
#    (psql -U postgres -c "CREATE DATABASE audit_internal;")
# 2. Env: sudah tersedia di .env (sesuaikan DATABASE_URL bila perlu)
# 3. Install & migrasi
npm install
npm run db:migrate
# 4. Jalankan
npm run dev
```

Buka http://localhost:3000. Saat pertama kali, pilih **Admin** dan buat PIN admin. Lalu atur PIN Produksi/Auditor di tab **Akses**.

Perintah lain:

```bash
npm run typecheck   # cek TypeScript
npm run lint        # ESLint
npm run build       # build produksi
npm run db:generate # buat file migrasi dari perubahan schema
```

## Deploy on-premise (Docker Compose)

Docker **hanya** menjalankan aplikasi + migrasi. Database memakai **PostgreSQL yang sudah ada** di server (bukan container).

Buat file `.env` di samping `docker-compose.yml`:

```env
DATABASE_URL=postgresql://user:pass@host.docker.internal:5432/audit_internal
SESSION_SECRET=<string-acak-panjang>
SESSION_COOKIE_SECURE=false
PIN_ADMIN=123098
PIN_PRODUKSI=123456
PIN_AUDITOR=123987
```

`host.docker.internal` menunjuk PostgreSQL di mesin host (bila DB di server lain, pakai IP/hostname-nya).

```bash
docker compose up -d --build
```

Compose menjalankan `migrate` (sekali jalan, `drizzle-kit migrate`) lalu `app`. Set `SESSION_COOKIE_SECURE=true` bila dilayani via HTTPS (mis. di belakang Caddy/nginx), biarkan `false` bila HTTP.

> **Migrasi otomatis:** aplikasi juga menjalankan migrasi saat start (`src/instrumentation.ts`), jadi tabel dibuat otomatis terhadap `DATABASE_URL` — tidak wajib langkah `migrate` terpisah. Set `SKIP_MIGRATE=1` untuk mematikannya. Cek kesiapan di `GET /api/health`.

## Catatan

- **PIN per peran via environment**: `PIN_ADMIN`, `PIN_PRODUKSI`, `PIN_AUDITOR`. Bila diisi, PIN tersebut yang berlaku dan kolom di halaman **Akses** menjadi read-only. Hapus variabelnya bila ingin mengatur PIN dari halaman Akses.
- **Ganti `SESSION_SECRET`** di produksi dengan string acak panjang sebelum dipakai tim.
- Migrasi data dari versi HTML lama (claude.ai) belum otomatis; perlu ekspor/impor terpisah bila diperlukan.
- Foto disimpan di database (`bytea`) — cukup untuk skala tim audit. Bila volume foto menjadi sangat besar, pindahkan ke object storage (S3/MinIO) — `ponytail:` catat titik ini.
