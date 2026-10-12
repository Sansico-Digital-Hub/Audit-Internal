# PRD — Audit Internal Produksi

**Versi:** 1.0 (draft)
**Status:** Untuk direview
**Sumber acuan workflow:** `referensi/Audit_Internal_Produksi_TERBARU_v5.html` (+ `versi-sebelumnya/`, `uji/`)
**Stack:** Next.js (App Router) + PostgreSQL/Drizzle, PWA, deploy on-prem
**Bahasa produk:** Indonesia

---

## 1. Ringkasan

Aplikasi audit internal untuk lini produksi manufaktur (cetak/packaging). Tim QC/QA/auditor memeriksa area produksi dan unit departemen memakai checklist berbobot, menilai tiap poin **M / DM / N/A**, mengunggah bukti foto pada temuan, lalu memantau skor lewat dashboard, menindaklanjuti temuan (action plan), dan mengarsipkan riwayat.

Skor utama: **capaian tiap seksi = M ÷ (M + DM) × bobot seksi**; skor total = rata-rata berbobot seksi yang terisi. Ambang: **standar 95**, **warning 85**.

---

## 2. Latar belakang & masalah

- Audit masih dijalankan lewat checklist manual + rekap spreadsheet → lambat, rawan salah hitung, bukti foto tak terpusat, tindak lanjut mudah hilang.
- Versi acuan (v5) adalah satu file HTML dengan penyimpanan di claude.ai → tidak bisa dipakai sehari-hari di lingkungan kerja, tidak ada database sendiri, tidak installable.
- Butuh: satu aplikasi yang bisa dipasang (PWA), jalan di server sendiri (on-prem), dipakai banyak orang, dan menampilkan tren antar-waktu.

---

## 3. Tujuan & metrik keberhasilan

| Tujuan | Metrik |
| --- | --- |
| Audit lebih cepat & konsisten | Waktu isi 1 audit area ≤ 10 menit; kelengkapan temuan (DM wajib foto) 100% |
| Visibilitas kualitas | Semua area & unit punya skor terbaru di dashboard; heatmap & tren mingguan terisi |
| Tindak lanjut terkendali | % temuan Closed dalam due date; jumlah temuan lewat due date turun |
| Adopsi | Dipakai rutin oleh ≥ 90% area/unit per periode audit |
| Aksesibilitas | Nyaman dipakai di HP operator maupun desktop manajer |

---

## 4. Pengguna & peran

| Peran | Siapa | Bisa apa | Tidak bisa |
| --- | --- | --- | --- |
| **Produksi / Departemen** (`prod`) | Supervisor/operator area atau unit | Lihat tren area/unit sendiri; isi action plan, PIC, due date, status temuan; tandai Closed (dengan bukti dari auditor/admin) | Isi form audit baru; tambah foto bukti; lihat area lain |
| **Auditor** (`auditor`) | Tim QC/QA | Isi form audit (produksi & departemen); lihat semua dashboard, temuan, riwayat; unggah bukti temuan & action plan; ubah daftar area | Atur PIN/akses; kelola poin checklist |
| **Admin** (`admin`) | Penanggung jawab sistem | Semua fitur + kelola poin checklist, daftar area, PIN/akses, hapus audit | — |

**Autentikasi:** PIN per peran (bcrypt) + sesi cookie httpOnly. Login pertama = pembuatan PIN admin (setup mode).

---

## 5. Ruang lingkup

### In-scope (v1)
Checklist produksi & departemen, penilaian M/DM/N/A, foto bukti, scoring, dashboard produksi & departemen, tren, heatmap, tindak lanjut temuan, riwayat, kelola area, poin checklist tambahan, kelola akses, ekspor CSV, PWA installable, auto-refresh.

### Out-of-scope (v1, kandidat v2)
Impor data historis dari v5, laporan cetak/PDF, notifikasi email/WA, SSO, multi-bahasa, tanda tangan digital, audit trail per-field, offline penuh (edit saat offline lalu sinkron).

---

## 6. Workflow inti (dari referensi)

### 6.1 Login
Pilih peran → (jika Produksi) pilih area/unit → masukkan PIN. Bila belum ada PIN admin → mode setup (buat PIN admin dulu).

### 6.2 Input audit (Auditor)
1. Pilih **Produksi** atau **Departemen lain**.
2. Isi tanggal, area/unit, auditor, auditee.
3. Tiap poin: **M** (sesuai) / **DM** (temuan) / **N/A** (tidak dihitung).
4. Poin **DM** wajib: keterangan temuan + minimal 1 foto (maks 4, dikompres di browser).
5. Skor live tampil di sticky bar (total + per seksi + progres + jumlah DM).
6. Simpan → foto diunggah, audit tersimpan, diarahkan ke dashboard.
7. Draft tersimpan lokal (aman jika halaman tertutup).

### 6.3 Tindak lanjut temuan (Produksi + Auditor/Admin)
- Tiap temuan: **action plan, PIC, due date, status** (Open/Progress/Closed).
- Unggah bukti action plan (auditor/admin; maks 8 foto).
- **Closed hanya bila ada minimal 1 foto bukti action plan.**
- Filter: belum closed / lewat due date / closed / semua + filter area-unit.

### 6.4 Monitoring (dashboard)
- **Dashboard Produksi:** KPI (rata-rata skor, area teraudit, di bawah standar, temuan belum closed); heatmap area × komponen; grafik tren mingguan (stack per komponen); skor terbaru per area; capaian per komponen; poin paling sering temuan.
- **Dashboard Departemen:** KPI; heatmap unit × periode (mingguan/bulanan); capaian kategori; tren per unit; skor terbaru per unit; poin paling sering temuan.

### 6.5 Riwayat, Area, Poin Checklist, Akses
- Riwayat: daftar audit + detail (skor per seksi, temuan+foto), hapus (admin).
- Area: ganti nama area produksi (auditor/admin).
- Poin Checklist: tambah/ubah/nonaktifkan poin (T1, T2…) per seksi/kategori (admin).
- Akses: atur PIN tiap peran (admin).

---

## 7. Kebutuhan fungsional (prioritas)

Legenda: **P0** wajib v1 · **P1** penting · **P2** nice-to-have.

| ID | Fitur | Prio |
| --- | --- | --- |
| F-01 | Login PIN 3 peran + setup PIN admin | P0 |
| F-02 | Form audit Produksi (39 poin, 4 seksi berbobot) | P0 |
| F-03 | Form audit Departemen (8 unit, kategori berbobot, unit QC punya sub-kategori) | P0 |
| F-04 | Penilaian M/DM/N/A + skor live | P0 |
| F-05 | DM wajib keterangan + foto (maks 4, kompres otomatis) | P0 |
| F-06 | Simpan audit + draft lokal | P0 |
| F-07 | Dashboard Produksi (KPI, heatmap, tren, komponen, top temuan) | P0 |
| F-08 | Dashboard Departemen (KPI, heatmap periode, tren, top temuan) | P0 |
| F-09 | Tindak lanjut temuan (plan/PIC/due/status + bukti) | P0 |
| F-10 | Riwayat + detail + hapus (admin) | P0 |
| F-11 | Kelola PIN/akses | P0 |
| F-12 | Kelola nama area | P1 |
| F-13 | Poin checklist tambahan (aktif/nonaktif, T1…) | P1 |
| F-14 | Ekspor CSV (skor & temuan) | P1 |
| F-15 | PWA installable + cache shell | P1 |
| F-16 | Auto-refresh data (30 dtk) | P1 |
| F-17 | Mode gelap | P2 |
| F-18 | Impor data historis v5 | P2 |
| F-19 | Laporan cetak/PDF | P2 |

---

## 8. Model data (ringkas)

- **config**: `access` (hash PIN per peran), `areas` (nama area), `customitems` (poin T).
- **audits**: `date, areaId, areaName, auditor, auditee, ans(jsonb), finds(jsonb), score(jsonb), createdAt`.
- **dept_audits**: `date, unit, unitName, dept, auditor, auditee, ans, finds, score, createdAt`.
- **photos**: `id, auditId, auditSrc, itemN, kind(photos|donePhotos), mime, data(bytea), createdAt`.
- **seed statis**: 39 poin produksi (4 seksi: Product 19, Process 31, System 25, Area Kerja 25) + 8 unit (FG IM, FG Packaging, Raw Material, QC, PE, Maintenance, IE, WIP PC) + 17 area produksi.

`finds` per poin DM: `{ finding, plan, pic, due, status, photos[], donePhotos[], closedAt }`.

---

## 9. Aturan scoring

- Seksi: `skor = M ÷ (M + DM) × bobot`; N/A tidak dihitung; seksi tanpa jawaban = belum dinilai.
- Total: `Σ skor_seksi ÷ Σ bobot_seksi_terisi × 100`.
- Ambang warna: **≥95 hijau (good)**, **≥85 kuning (warn)**, **<85 merah (bad)**, tanpa data abu (na).
- Menambah poin checklist **tidak mengubah bobot seksi** dan **tidak mengubah skor audit lama** (nilai per poin = bobot ÷ jumlah poin seksi).

---

## 10. Non-functional requirements

| Aspek | Target |
| --- | --- |
| Responsif | HP (≥360px) & desktop (≤1440px); target ketuk ≥44px; tabel lebar bisa scroll / jadi kartu di HP |
| PWA | Installable, offline shell, lanjutkan draft |
| Performa | Muat awal di jaringan kantor wajar; list audit besar tetap responsif (agregasi efisien) |
| Keamanan | PIN bcrypt, sesi JWT httpOnly, cookie Secure saat HTTPS, endpoint tulis perlu sesi, hapus = admin |
| Data | PostgreSQL, backup harian, foto disimpan `bytea` (skala tim) |
| Deploy | Docker Compose on-prem (db + migrate + app), HTTPS via reverse proxy |
| Bahasa | Seluruh UI Bahasa Indonesia, istilah audit konsisten |

---

## 11. Rencana rilis

1. **Fase 0 (selesai)** — fondasi Opsi A: DB, auth PIN, API, port fitur v5, PWA, Docker.
2. **Fase 1 (fokus sekarang)** — **redesign frontend**: dominan putih+biru, lebih rapi & responsif (lihat `docs/DESIGN-SYSTEM.md`).
3. **Fase 2** — impor data historis, laporan cetak/PDF.
4. **Fase 3** — notifikasi tindak lanjut, audit trail, opsi offline penuh.

---

## 12. Keputusan & pertanyaan terbuka

**Sudah diputuskan (11 Jun):**
1. Biru utama brand: **`#1F5FE8`** (skala lengkap di design system).
2. **Mode gelap dihapus** — fokus tema terang putih + biru.
3. Palet grafik: **biru-family** (blue/sky/indigo + netral).
4. Impor data historis v5: **belum perlu** (fase 2).

**Masih terbuka:**
1. Nama/branding aplikasi & logo (dipakai di header + ikon PWA) — sementara "Audit Internal".
2. Perlu laporan PDF resmi (tanda tangan/approval) di fase 1?

---

## Lampiran A — Acuan referensi

| Referensi | Dipakai untuk |
| --- | --- |
| `Audit_Internal_Produksi_TERBARU_v5.html` | Workflow, daftar poin/area/unit, aturan skor, struktur dashboard |
| `versi-sebelumnya/v3_asli.html`, `v4…html` | Riwayat perubahan perilaku |
| `uji/test_poin_checklist.py` | Perilaku poin checklist tambahan (T1…), XSS-safe |
| `BACA-DULU.txt` | Konteks penyimpanan & aturan skor |
