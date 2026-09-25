# SIPUS — Design System

> **Sistem Informasi Perpustakaan SMA Swasta Pencawan**
> Acuan resmi pengembangan UI agar seluruh halaman (Login, Siswa, Guru, Admin) tampil dan bekerja **konsisten** — satu identitas biru-putih-kuning yang profesional dan ramah untuk pelajar.

## 1. Prinsip Desain

| Prinsip | Penjelasan |
|---|---|
| **Satu identitas** | Semua peran memakai token, komponen, dan pola halaman yang sama dari file ini. |
| **Ramah pelajar** | Tipografi jelas, ikon familiar, karakter maskot, teks pendek & suportif. |
| **Profesional** | Tabel, badge status, dan tombol konsisten di semua peran; tidak ada gaya ad-hoc per halaman. |
| **Ringan** | Vanilla HTML/CSS/JS, animasi halus & singkat, `prefers-reduced-motion` dihormati. |
| **Responsive** | Desktop = sidebar kiri; mobile ≤900px = topbar + bottom navigation. |

---

## 2. Brand & Identitas

| Elemen | Nilai |
|---|---|
| Nama | **SIPUS** |
| Subjudul | *Sistem Informasi Perpustakaan SMA Swasta Pencawan* |
| Tagline | **Baca Hari Ini, Raih Masa Depan** |
| Logo | `assets/sipus-logo.png` (buku + topi wisuda). Dipakai sebagai favicon, panel auth (`.auth-brand-mark`, `.auth-mobile-brand`), sidebar dashboard (`assets/sipus-logo.png` default, diputihkan di sidebar gelap dengan `filter: brightness(0) invert(1)`), splash (`.auth-splash__mark`) dan header mobile (`.topbar-logo`). |
| Maskot siswa laki | `assets/student-reading.svg` (hero & empty state) |
| Maskot siswi | `assets/student-female.svg` (poster latar biru 640×430, empty state riwayat/rekomendasi) |
| Maskot guru | `assets/teacher-reading.svg` (hero portal guru) |
| Foto panel | `pages/image2.png` (siswa+laptop, login/index), `pages/image3.png` (siswi baca, register/bg admin) |

Role portal diberi label tegas di hero: `Portal Siswa`, `Portal Guru`, `Panel Pustakawan` (komponen `.hero-kicker`).

---

## 3. Warna (CSS Variables — `css/style.css :root`)

```css
--primary:      #0B5CAD   /* biru utama CTA    */
--primary-dark: #06457F
--primary-deep: #04386D   /* teks gradasi     */
--primary-soft: #E8F1FB   /* latar chip lembut */
--accent:       #F4C62E   /* kuning aksen     */
--accent-soft:  #FEF7DC
--accent-dark:  #B07D00   /* teks pada kuning */
--bg:           #F2F7FC
--surface:      #FFFFFF
--text:         #17324D
--text-muted:   #5B7186
--border:       #E3ECF5
--success: #16A36A  --warning: #F59E0B  --danger: #E5484D
--shadow / --shadow-hover
--sidebar-gradient: linear-gradient(180deg, #075cae, #064783, #04386d)
--hero-gradient:    linear-gradient(115deg, #04386d, #07529a, #0b75c9)
```

**Aturan:** hijau = aman/sukses, kuning/oranye = menunggu/perhatian, merah = bahaya/ditolak, biru = info/aksi utama. Hindari warna ungu. Jangan hardcode hex di halaman/JS — pakai variable (mis. `var(--success)`). Klik statistik/teks kuning memakai `var(--accent-dark)`, bukan `#B07D00`.

---

## 4. Tipografi, Radius & Bayangan

- **Font:** hanya **Inter** 400–800 dimuat di setiap HTML; body default `15px`/1.55.
- **Skala:** halaman `h1` 22px/800, hero `h2` 22px/800, deck 14px, label tabel 12px bold uppercase.
- **Radius:** kartu `14px`, input/tombol `10px`, button small `10px`, hero `18px`, pill penuh untuk chip.
- **Bayangan:** `--shadow` lembut & `--shadow-hover` untuk hover kartu.

---

## 5. Komponen Umum (wajib dipakai bersama)

| Komponen | Class | Keterangan |
|---|---|---|
| Hero | `.hero` + `.hero-kicker` + `h2` + `img.hero-student-art` + `.hero-cta` | Gradien `--hero-gradient`, radius 18, karakter melayang (`floatChar`, mati ≤700px). CTA siswa=accent "Jelajahi Katalog", guru=accent "Usulkan Buku", admin=`btn-glass` "Tambah Buku". |
| Kartu statistik | `.stat-grid > .stat-card` | Ikon sesuai semantik: blue, yellow, orange, red, green. Hover terangkat. |
| Kartu buku | `.book-grid > .book-card` | `.book-cover` (img/no-cover), `.book-cat`, `.book-title`, `.book-author`, `.book-foot` (badge), `.book-actions` (Detail + aksi peran). |
| Kartu peminjaman | `.loan-item` + `.mini-cover` | Baris pinjaman/riwayat singkat. |
| Tabel | `.table-wrap > .table` | Header `#F8FBFE`, div `.td-title`/`.sub`, aksi ikon `.td-actions > .action-btn` (`.red|.green|.orange|.blue`). |
| Badge | `.badge badge-{type}` | types: `primary, accent, success, warning, danger, neutral` (lewat helper `A.badgeHtml`/`A.loanBadge`/`badge-warning` dll). |
| Tombol | `.btn`, `.btn-sm/lg`, `.btn-outline`, `.btn-ghost`, `.btn-danger(-outline)`, `.btn-success`, `.btn-accent`, `.btn-glass` | Glass khusus di dalam hero putih. |
| Form | `.field > label + .input/.select/.textarea`, `.input-group`, `.checkbox-row > .checkbox-pill`, `.login-type-switch` (tabular 2/3 kolom) | Validasi + toast. |
| Filter | `.filters > .filter-chip` / `.filter-select` | Chip aktif biru solid. |
| Empty state | `A.emptyState(iconOrArt, title, msg, actionHtml)` | `.empty` (ikon) / `.empty-art` (maskot SVG + tombol aksi). |
| Pagination | `A.renderPagination` | `→` prev/next + nomor. |
| Modal | `A.openModal(title, body, {onOpen})`, `A.confirmDialog(...)`, `A.toast(type, title, msg)` | Shared, dipakai semua peran. |
| Pengumuman | `.announce-banner` | Info sampingan / catatan. |
| Detail buku | `.detail-layout > .detail-cover + .detail-meta`, `.stock-box`, `.detail-sinopsis` | Rasio 300px/1fr, turun 1 kolom ≤800px. |
| Profil | `.profile-head` + `.profile-avatar` + `.meta-row` | Inisial avatar (2 huruf). |
| Timeline | `.notif-item` (+ `.notif-icon/.notif-body/.time`) | Riwayat aktivitas, tombol "Lihat Detail". |
| Menu cepat | `.quick-menu > .quick-menu-item` | Shortcut grid di dashboard (guru). |
| Tombol aksi kartu | `.card-hover` | Kartu kecil interaktif. |

**Aturan emoji:** boleh untuk maskot/kicker/pengumuman (suportif), tidak untuk tombol utama selain ikon SVG `ICONS`.

---

## 6. Layout & Navigasi per Peran

Struktur bersama (dari `js/app.js`): `A.buildSidebar` (gradien `--sidebar-gradient`, logo `assets/sipus-logo.png` diputihkan `.default-logo`, menu aktif beraksen, foot akun popover) + `A.buildTopbar` (ribbon, subtitel, search, lonceng, avatar, logo mobile `.topbar-logo`) + `A.afterLayout(cfg)` = routing klik & popover. Bottom nav mobile diisi tiap modul.

| Peran | Entry | Sidebar/Bottom Nav | Hero | CTA utama |
|---|---|---|---|---|
| **Siswa** | `app-student.html` / `js/student.js` | Beranda, Katalog Buku, Pinjaman Saya, Riwayat Peminjaman, Buku Favorit, Notifikasi, Profil Saya, Pusat Bantuan | "Halo, {nama}! 👋" / `student-reading.svg` | Jelajahi Katalog |
| **Guru** | `app-guru.html` / `js/guru.js` | Beranda, Katalog Buku, Usulan Buku, Rekomendasi Saya, Peminjaman, Riwayat, Profil | "Rekomendasikan Buku Untuk Masa Depan Mereka" / `teacher-reading.svg` | Usulkan Buku |
| **Admin** | `app-admin.html` / `js/admin.js` | Dashboard, Data Buku, Kategori, Manajemen Stok, Data Siswa, Peminjaman, Pengembalian, Usulan Guru, Laporan, Notifikasi, Audit, Pengaturan | "Dashboard Perpustakaan" / `student-reading.svg` (90% opacity) | Tambah Buku (glass) + {n} Menunggu Persetujuan |

Login `/login.html` = `js/login.js`: tab 3 peran, judul/subjudul/tombol berubah per role ("Masuk", "Masuk sebagai Guru", "Masuk sebagai Admin"), label field (NIS/NISN, Username Guru, Username Admin), link daftar hanya untuk Siswa. Redirect: siswa→`app-student.html`, guru→`app-guru.html`, admin→`app-admin.html`.

Register `/register.html`: judul "Daftar sebagai Siswa", sub "Gabung dengan perpustakaan digital SMA Swasta Pencawan…", CTA "Daftar Sekarang".

---

## 7. Model Data (sync antar peran)

- `students` (siswa), `users` (auth), `teacher_profiles` (guru: `id, user_id, nip, nama, mapel, kelas, email, no_hp, foto`).
- `books` + `categories` (koleksi), `loans` (status: `requested/active/overdue/returned`), `favorites`, `notifications`, `audit_logs`.
- `book_requests` (usulan guru): `id, teacher_id, type ("rekomendasi"|"karya_sendiri"), title, author, publisher, isbn, year, category_id, cover, target_class, reason, status ("pending"|"approved"|"rejected"), created_at, reviewed_at, review_note`. Status UI: Menunggu/Disetujui/Ditolak.
- `recommendations` (rekomendasi guru): `id, teacher_id, book_id, title, author, category, target_class, reason, status "published", created_at`. Dashboard siswa menampilkan yang `status==="published"`.

**Migrasi `localStorage`** (`getDB` di `data.js`): otomatis isi `teacher_profiles/book_requests/recommendations` bila kosong dan ganti nama sekolah lama "SMAN 1 Nusantara" → **SMA Swasta Pencawan**.

---

## 8. Halaman (Referensi Spek 24 Halaman)

| # | Halaman | Peran | Implementasi |
|---|---|---|---|
| 1-4 | Login / Register / Splash / Bantuan | Semua | `login.html`, `register.html`, `index.html`, view `bantuan` siswa |
| 5-12 | Siswa: Beranda, Katalog, Detail, Pinjaman, Riwayat, Favorit, Notifikasi, Profil | Siswa | `renders` di `student.js` |
| 13-20 | Guru: Beranda, Katalog, Detail, Usulan, Rekomendasi, Peminjaman, Riwayat, Profil(+password) | Guru | `renders` di `guru.js` |
| 21-24 | Admin: Dashboard, Buku, Kategori, Stok + Siswa, Peminjaman, Pengembalian, Laporan, Notifikasi, Audit, Pengaturan, Usulan Guru | Admin | `renders` di `admin.js` |

Detail buku antar peran dibuka via `.detail-layout` yang sama; aksi tombol hanya ada sesuai peran (siswa "Pinjam", guru "Rekomendasikan ke Siswa", admin "Edit/Hapus").

---

## 9. Animasi

- `sipusFadeUp` (konten), `sipusFadeIn`, `sipusSlideRight` (panel), `sipusGradient`, `floatChar` (maskot hero/empty art).
- Durasi < 0.5s; `@media (prefers-reduced-motion: reduce)` mematikan animasi (keberadaan CSS sudah disiapkan).

---

## 10. Pendekatan Pengembangan

1. Raut halaman peran lewat kerangka shared app (`window.APP`) — jangan buat layout sendiri.
2. Ambil data via `window.SIPUS` helper (`bookById`, `categoryName`, `studentById`, `fmtDate`, `timeAgo`, `bookStatus`, `loanStatusInfo` dll).
3. Tambah komponen baru di `css/style.css` (section berkomentar), bukan inline di HTML/JS.
4. Syntax-cek JS: `node --check`.

---

## Referensi Lisensi & Versi
- Semua kode lokal vanilla; aset karakter adalah SVG internal proyek.
- Document ini update terakhir: v2.0.0 (unifikasi UI Siswa–Guru–Admin).