# Design System — Audit Internal Produksi

**Versi:** 1.0 (draft)
**Arah:** Dominan **putih + biru**. Warna status (hijau/kuning/merah) hanya untuk makna (skor & temuan), bukan dekorasi.
**Acuan visual lama:** `referensi/Audit_Internal_Produksi_TERBARU_v5.html`
**Basis kode:** `src/app/globals.css` (tokens CSS) + komponen di `src/components/`

---

## 1. Prinsip

1. **Putih sebagai kanvas, biru sebagai aksi.** Latar & kartu putih; biru menandai elemen interaktif (tombol, tab aktif, tautan, fokus) dan identitas.
2. **Warna = makna.** Hijau/kuning/merah hanya menandai skor (≥95 / ≥85 / <85) dan status temuan. Jangan pakai untuk hiasan.
3. **Tenang & padat informasi.** Prioritaskan keterbacaan; garis tipis dan latar putih, bukan bayangan berat.
4. **Mobile-first.** Target ketuk ≥44px, tata letak kolom tunggal menyesuaikan, tabel lebar → kartu.
5. **Konsisten.** Satu sistem token untuk warna, spasi, radius, tipe. Tidak ada nilai lepas.

---

## 2. Warna

### 2.1 Brand — Biru (skala)

| Token | Hex | Pemakaian |
| --- | --- | --- |
| `--blue-50` | `#eff5ff` | latar lembut, hover |
| `--blue-100` | `#dbe9fe` | chip terpilih, sel terpilih |
| `--blue-200` | `#bfd8fe` | border fokus lembut |
| `--blue-300` | `#93befd` | — |
| `--blue-400` | `#609bfa` | grafik |
| **`--blue-600` (primary)** | **`#1f5fe8`** | tombol utama, tab aktif, tautan, ikon |
| `--blue-700` | `#1a4ccc` | hover tombol utama |
| `--blue-800` | `#1c41a6` | pressed |
| `--blue-900` | `#1d3a82` | teks di atas latar biru muda |
| `--blue-950` | `#142450` | — |

### 2.2 Netral (putih dominan)

| Token | Hex | Pemakaian |
| --- | --- | --- |
| `--white` | `#ffffff` | kartu, header, input |
| `--neutral-50` | `#f8fafc` | latar halaman |
| `--neutral-100` | `#f1f5f9` | latar header seksi, fill lembut |
| `--neutral-200` | `#e6ecf3` | garis/border |
| `--neutral-300` | `#cfd8e3` | border input, pemisah |
| `--neutral-400` | `#9aa8ba` | ikon nonaktif, placeholder |
| `--neutral-500` | `#64748b` | teks muted |
| `--neutral-700` | `#334155` | teks sekunder |
| `--neutral-900` | `#0f172a` | teks utama (ink) |

### 2.3 Semantik (status & skor)

| Token | Hex | Latar | Teks | Pemakaian |
| --- | --- | --- | --- | --- |
| `--good` | `#16a34a` | `#dcfce7` | `#166534` | M, skor ≥95, Closed, memenuhi |
| `--warn` | `#d97706` | `#fef3c7` | `#92400e` | skor 85–94, Progress |
| `--bad` | `#dc2626` | `#fee2e2` | `#991b1b` | DM, skor <85, lewat due date |
| `--info` | `#1f5fe8` | `#eff5ff` | `#1a4ccc` | netral informatif, N/A besar |
| `--na` | `#64748b` | `#eef2f7` | `#64748b` | belum diaudit, N/A, nonaktif |

### 2.4 Grafik (deret data)

Blue-family + 1 netral agar terbaca & tetap “biru”:

| Token | Hex | Seksi |
| --- | --- | --- |
| `--c1` | `#1f5fe8` | Product |
| `--c2` | `#0ea5e9` | Process |
| `--c3` | `#6366f1` | System |
| `--c4` | `#94a3b8` | Area Kerja |

Heatmap skor memakai `--good/--warn/--bad` sesuai ambang. Garis standar = `--warn` putus-putus.

### 2.5 Aturan pakai

- **Boleh:** biru untuk aksi/identitas; putih/`neutral-50` untuk latar; status hanya sebagai indikator.
- **Jangan:** tombol hijau/merah kecuali makna (mis. tombol hapus = merah), latar kartu berwarna-warni, gradien ramai.
- Kontras teks minimal **AA** (≥4.5:1 teks normal). Putih di atas `--blue-600` ≈ 4.6:1 (aman).

---

## 3. Tipografi

| Peran | Font | Bobot | Ukuran |
| --- | --- | --- | --- |
| Display / judul & angka KPI | **Barlow Condensed** | 600–700, uppercase | 20–34px |
| Body / UI | **IBM Plex Sans** | 400–600 | 14px (dasar), 12–13px sekunder |
| Angka / ID / skor | **IBM Plex Mono** | 500 | menyamai sekitarnya |

- Judul halaman: display 22–24px uppercase, letterspacing 0.02em.
- Label form: 12px, uppercase, `--neutral-500`, letterspacing 0.03em.
- Tabel header: 11px uppercase `--neutral-500`.

---

## 4. Spasi, radius, elevasi

- **Spasi** (skala 4px): 4, 8, 12, 16, 24, 32, 48. Gap antar-kartu 16–20px.
- **Radius**: `--r-sm 6px` (input/segmen), `--r-md 8px` (kartu), `--r-lg 12px` (panel besar), `--r-pill 999px`.
- **Border**: 1px `--neutral-200` (kartu), `--neutral-300` (input).
- **Elevasi** (hemat, putih dominan): `--shadow-sm 0 1px 2px rgba(15,23,42,.05)`; `--shadow-md 0 6px 16px rgba(15,23,42,.08)` untuk popover/toast saja.

---

## 5. Layout & breakpoint

- Konten `max-width: 1200px`, gutter 16px (mobile) / 24px (desktop).
- **Breakpoint**: `sm 480`, `md 640`, `lg 1024`, `xl 1280`.
- Grid KPI: `repeat(auto-fit, minmax(200px,1fr))`.
- Grid 2 kolom (tren + bar): jadi 1 kolom <860px.
- Header sticky: brand + tab (scroll horizontal di mobile) + identitas peran.
- Sticky bar bawah pada form audit (skor live + tombol simpan), beri `padding-bottom` konten agar tak tertutup.

---

## 6. Komponen

### 6.1 Tombol
| Varian | Tampilan | Pakai |
| --- | --- | --- |
| **Primary** | bg `--blue-600`, teks putih | aksi utama (Simpan, Masuk) |
| **Ghost** | border `--blue-600`, teks `--blue-600`, bg transparan | aksi sekunder |
| **Danger** | border/teks `--bad`, bg transparan | hapus |
| **Small** | tinggi 32–36px, padding 6/10 | aksi dalam kartu/tabel |
- Radius 6px, min-height 42px (primary), target ketuk ≥44px. Hover: `--blue-700` / bg `--blue-50`. Disabled: opacity 0.5.

### 6.2 Input & label
- Tinggi 40–44px, border `--neutral-300`, radius 6px, fokus ring `--blue-600` 2px.
- Label di atas, uppercase kecil. Bantuan/error di bawah (error teks `--bad`).

### 6.3 Segmented control (M / DM / N/A, peran, jenis audit)
- Bungkus bergaris radius 8px, segmen `flex:1`.
- Terpilih: **M** bg good, **DM** bg bad, **N/A** bg na; teks kontras.
- Mobile: full-width, target ketuk 44px.

### 6.4 Kartu & panel
- Kartu: bg putih, border 1px, radius 8–12px. Header seksi: bg `--neutral-100`.
- Panel dashboard: padding 16px, gap 12px, judul + kontrol kanan.

### 6.5 App shell & sidebar (navigasi)
- **Bukan navbar atas**, tapi **sidebar kiri yang bisa dilipat** (collapsible), gaya panel bergaya editor/Claude.
- **Desktop (≥901px):** lebar 260px; tombol lipat (ikon panel) menyusutkan ke **rail 68px** (ikon saja). Item aktif: latar `--blue-50`, teks `--blue-700`, indikator batang kiri `--blue-600`. Preferensi lipat disimpan di `localStorage`.
- **Mobile (≤900px):** sidebar jadi **drawer** yang meluncur dari kiri (lebar 264px) dengan overlay gelap + tombol tutup; dibuka lewat ikon menu di topbar.
- Isi: brand di atas, daftar menu (ikon + label), **badge jumlah temuan** pada menu Temuan, lalu identitas peran + tombol Keluar di bawah.
- Menu menyesuaikan peran (Produksi hanya Tren + Action Plan; Auditor; Admin semua). Satu menu = **satu halaman/route** (bukan tab) dan dijaga server-side per peran.
- Ikon: garis 1.8px `currentColor`, 20px di nav; tombol ikon 40×40px (target ketuk nyaman).

### 6.6 Pill/badge status
- Radius pill, 12px, bobot 600. Varian good/warn/bad/na/info. Contoh: `#9 20×` (bad), `M`, `N/A`, `Closed`.

### 6.7 KPI
- Label 12px uppercase muted; angka display 34–40px; sub 12px muted. Angka diwarnai sesuai skor.

### 6.8 Tabel & heatmap
- Header 11px uppercase; baris border-bottom 1px; hover `--neutral-100`.
- Sel heatmap: angka mono, bg good/warn/bad/na, `min-width 84px`.
- Tabel lebar dalam `.scroll` (overflow-x auto). **Mobile:** tabel riwayat → **kartu** (label:nilai), tabel lain scroll.

### 6.9 Foto (bukti temuan)
- Thumbnail 84×84, radius 6px, border. Tombol hapus bulat merah di pojok. Klik → lightbox (latar gelap). Input: "Ambil foto" (kamera) & "Dari galeri". Maks 4 (input) / 8 (tindak lanjut).

### 6.10 Sticky bar (form audit)
- Fixed bawah: skor total (display besar) + progres + per-seksi, tombol Kosongkan & Simpan. Mobile: tombol melebar.

### 6.11 Toast & state kosong
- Toast: bg `--neutral-900`, teks putih, radius 6px, auto-hilang 3.2 dtk, muncul di atas sticky bar.
- Empty state: ikon/teks muted, `--neutral-500`, padding 28px.

---

## 7. Gerak (motion)

- Transisi 150ms ease pada hover/fokus tombol & warna.
- Tanpa animasi dekoratif; hormati `prefers-reduced-motion`.

---

## 8. Aksesibilitas

- Fokus terlihat (ring biru) di semua kontrol.
- Target ketuk ≥44×44px.
- Kontras teks ≥4.5:1; status tidak hanya warna (sertakan teks: "DM", "Closed", angka).
- Semua kontrol punya label; ikon dekoratif `aria-hidden`.

---

## 9. PWA & responsif

- `manifest.webmanifest` + service worker (cache shell, API selalu jaringan).
- Installable di Android/iOS; ikon biru brand.
- Draft audit tersimpan lokal; lanjut walau halaman tertutup/offline saat mengisi.

---

## 10. Implementasi (token CSS)

Ganti blok `:root` di `src/app/globals.css` dengan token berikut (nama lama dipetakan agar tak mengubah komponen):

```css
:root{
  /* brand */
  --blue-50:#eff5ff; --blue-100:#dbe9fe; --blue-200:#bfd8fe; --blue-300:#93befd;
  --blue-400:#609bfa; --blue-600:#1f5fe8; --blue-700:#1a4ccc; --blue-800:#1c41a6;
  --blue-900:#1d3a82; --blue-950:#142450;
  /* netral */
  --white:#fff; --neutral-50:#f8fafc; --neutral-100:#f1f5f9; --neutral-200:#e6ecf3;
  --neutral-300:#cfd8e3; --neutral-400:#9aa8ba; --neutral-500:#64748b;
  --neutral-700:#334155; --neutral-900:#0f172a;
  /* semantik */
  --good:#16a34a; --good-bg:#dcfce7; --good-ink:#166534; --good-fill:#16a34a;
  --warn:#d97706; --warn-bg:#fef3c7; --warn-ink:#92400e; --warn-fill:#eab308;
  --bad:#dc2626;  --bad-bg:#fee2e2;  --bad-ink:#991b1b;  --bad-fill:#ef4444;
  --na:#64748b;   --na-bg:#eef2f7;   --na-ink:#64748b;   --na-fill:#94a3b8;
  /* grafik */
  --c1:#1f5fe8; --c2:#0ea5e9; --c3:#6366f1; --c4:#94a3b8;
  /* pemetaan lama -> baru (agar komponen tak berubah) */
  --bg:var(--neutral-50); --surface:var(--white); --surface2:var(--neutral-100);
  --ink:var(--neutral-900); --muted:var(--neutral-500); --line:var(--neutral-200);
  --accent:var(--blue-600); --accent-ink:#fff; --accent-soft:var(--blue-50);
  --on-good:#052e16; --on-bad:#450a0a; --seg-ink:#fff;
  --f-display:'Barlow Condensed','Arial Narrow',sans-serif;
  --f-body:'IBM Plex Sans',system-ui,sans-serif;
  --f-mono:'IBM Plex Mono',ui-monospace,monospace;
  --r-sm:6px; --r-md:8px; --r-lg:12px; --r-pill:999px;
  --shadow-sm:0 1px 2px rgba(15,23,42,.05); --shadow-md:0 6px 16px rgba(15,23,42,.08);
}
```

**Aturan mesin warna:** latar halaman `--neutral-50`, kartu `--surface` (putih). Hindari latar abu tua; gunakan biru hanya untuk aksi/identitas.

---

## 11. Checklist sebelum rilis redesign

- [ ] Semua tombol aksi memakai biru utama/ghost; danger hanya untuk hapus.
- [ ] Tidak ada warna status dipakai sebagai dekorasi.
- [ ] Target ketuk ≥44px; uji di 360px, 390px, 768px, 1280px.
- [ ] Tabel riwayat jadi kartu di mobile; heatmap bisa scroll.
- [ ] Kontras AA terpenuhi; fokus terlihat.
- [ ] Draft & auto-refresh tetap jalan. (Mode gelap dihapus — tema terang putih+biru saja.)
