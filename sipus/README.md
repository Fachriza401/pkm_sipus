# SIPUS — Sistem Informasi Perpustakaan Sekolah

Platform katalog, stok buku, peminjaman, pengembalian, monitoring siswa, dan administrasi perpustakaan.
Dibangun dengan **HTML5 + CSS3 + Vanilla JavaScript** — tanpa framework.

## Fitur

### Siswa
- Login NIS/NISN + password
- Dashboard: pinjaman aktif, jatuh tempo terdekat, rekomendasi
- Katalog dengan pencarian, filter kategori/status, urutan
- Detail buku: cover, sinopsis, metadata, stok, rak, tombol pinjam
- Ajukan peminjaman (menunggu persetujuan admin)
- Pinjaman aktif + penghitung kuota
- Riwayat, Favorit, Notifikasi (jatuh tempo & pengumuman), Profil, Bantuan/FAQ

### Admin / Pustakawan
- Dashboard statistik + transaksi terbaru + buku terlambat + buku terpopuler
- CRUD Data Buku, Kategori, Manajemen Stok (total/rusak/hilang)
- Data Siswa (tambah/ubah/aktif-nonaktif/detail + riwayat)
- Verifikasi peminjaman (setujui/tolak), Pengembalian (verifikasi kondisi)
- Pengumuman, Laporan + export CSV, Audit aktivitas, Pengaturan

## Akun Demo

| Peran | Login | Password |
|-------|-------|----------|
| Siswa | `2025101` | `siswa123` |
| Siswa | `2025102` | `siswa123` |
| Admin | `admin` | `admin123` |

## Cara Menjalankan Lokal

Cukup buka `index.html` di browser, atau jalankan server statis:

```bash
npx serve .
```

## Deploy ke Vercel (Gratis)

1. Pastikan sudah punya akun di [vercel.com](https://vercel.com).
2. Install CLI (opsional): `npm i -g vercel`
3. Dari folder ini:

```bash
vercel
# pilih: Existing project? No, buat baru
# pilih: folder "sipus" sebagai root
# framework preset: Other
```

Atau cara tanpa CLI — drag & drop folder `sipus` ke dashboard Vercel di https://vercel.com/new.

Data tersimpan di **localStorage** masing-masing browser (prototype/demo). Untuk produksi dengan multi-perangkat dan akun siswa sebenarnya, ganti lapisan data di `js/data.js` dengan backend Supabase/Firebase (lihat catatan di `js/data.js`).

## Struktur

```
sipus/
├── index.html           → halaman pembuka (redirect ke login)
├── login.html           → halaman login siswa & admin
├── app-student.html     → aplikasi siswa (SPA)
├── app-admin.html       → aplikasi admin (SPA)
├── vercel.json          → konfigurasi deploy Vercel
├── css/style.css        → design system SIPUS
└── js/
    ├── data.js          → localStorage + data awal (seed)
    ├── app.js           → inti: auth, router, UI, render helper
    ├── login.js         → logika login
    ├── student.js       → semua fitur siswa
    └── admin.js         → semua fitur admin
```

## Catatan Teknologi

PRD menempatkan HTML/CSS/JS murni sebagai **frontend tanpa framework**. Untuk
produksi nyata (akun siswa sejati, DB terpusat, transaksi lintas perangkat),
tetap diperlukan backend/API + database — misalnya Supabase, yang bisa dipanggil
langsung dari vanilla JS via `fetch`.

## SIPUS v2 — Pembaruan Proyek PKM

### Role login
- **Siswa:** `2025101` / `siswa123`
- **Guru:** `guru` / `guru123`
- **Admin:** `admin` / `admin123`

### Fitur baru
- Koleksi buku dummy diganti dengan metadata buku riil dan URL kover Open Library.
- Admin dapat mengubah seluruh metadata buku dan mengganti kover melalui URL atau upload gambar.
- Role **Guru** dengan dashboard khusus.
- Guru dapat mengajukan **karya sendiri** untuk ditinjau admin.
- Guru dapat membuat **rekomendasi buku** untuk kelas tertentu dan menjelaskan alasannya.
- Admin memiliki menu **Usulan Guru** untuk menyetujui/menolak karya guru.
- Usulan karya guru yang disetujui dapat otomatis masuk ke katalog.
- Rekomendasi guru yang dipublikasikan tampil pada dashboard siswa.
- UI mempertahankan sistem warna biru-putih-kuning dari desain referensi dan diperhalus untuk desktop/mobile.
- Asset karakter siswa tetap diintegrasikan melalui `assets/student-reading.svg`.

### Catatan data
Data demo disimpan di `localStorage` dengan key `sipus_db_v2`. Jika membuka versi lama yang pernah menyimpan `sipus_db_v1`, versi baru akan menggunakan seed v2 sehingga data buku riil dan role Guru langsung tersedia.
