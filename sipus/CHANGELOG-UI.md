# SIPUS UI Refresh — v1.6.0

- **Hardening mobile menyeluruh** (semua portal: siswa, guru, admin):
  - **Tabel padat → kartu bertumpuk** di ≤640px. Semua 12 tabel kini memakai `.table-cards` + `data-label` pada setiap `<td>`, sehingga label kolom tetap terbaca tanpa header tabel. Berlaku untuk: Koleksi Buku, Stok Buku, Data Siswa, Data Guru, Peminjaman (aktif), Rekap Terlambat, Audit Aktivitas (admin); Usulan Buku, Rekomendasi Buku, Peminjaman Siswa (guru); Riwayat Peminjaman (siswa); Aktivitas Peminjaman (guru portal lama).
  - Baris "belum ada data" kini memakai kelas `.row-empty` (gaya dipusatkan di desktop, jadi blok pesan penuh di mode kartu) — bukan lagi `style` inline.
  - **Anti-overflow horizontal**: anak container layout diberi `min-width: 0` (grid/flex default `min-width:auto`), `word-break` longgar pada sel, dan `.table-wrap` memakai `overscroll-behavior-x: contain` + gradien penanda geser.
  - **Modal jadi bottom sheet** di ≤640px: rata bawah, radius atas membulat, `max-height: 92svh`, padding aman `env(safe-area-inset-bottom)`, dan `transform` yang dihormati `prefers-reduced-motion`.
  - **Jangkauan sentuh minimum 44px** untuk tombol, nav, chip filter, avatar, ikon aksi, dan toggle grafik; `input/select/textarea` dinaikkan ke `font-size: 16px` agar iOS tidak auto-zoom.
  - Ikon-aksi tetap kotak 44px (tidak melebar), sedangkan tombol berlabel di kolom Aksi membagi rata memenuhi lebar kartu.
  - **Gaya admin tidak lagi bentrok** dengan mode kartu: aturan `min-width`, `white-space: nowrap`, dan ellipsis pada `.td-cell` dinetralkan khusus di `.table-cards`.
- **Perbaikan halaman Registrasi di ponsel**:
  - Form Guru tidak lagi ikut tampil di bawah form Siswa. `body.auth-register .a-reg-form { display: grid }` di `@media (max-width: 768px)` menimpa aturan `[hidden]` dari UA stylesheet, sehingga `register.js` yang menyembunyikan form lewat `hidden` jadi tidak berlaku. Ditambahkan `.a-reg-form[hidden] { display: none !important; }`.
  - Logo ponsel dihapus dari header brand (login & register) karena tidak terbaca di atas kartu putih. `.auth-mobile-brand` kini hanya menampilkan teks: kicker **Portal Akun** + nama **SIPUS** secara terpusat. Aturan yatim (`.auth-mobile-brand-logo`, `img`, `-text`, `-sub`, `-school`, dan panel kaca 1000px) ikut dibersihkan.
  - `login.js` tetap aman: `brandSchoolMobile` di-check null sebelum diisi.

# SIPUS UI Refresh — v1.5.0

- **Notifikasi realtime & tersinkronisasi** untuk semua peran (Siswa, Guru, Admin):
  - Badge angka unread di ikon lonceng header (`#notifBadge`) + titik indikator.
  - Badge angka pada menu **Notifikasi** di sidebar (dan bottom-nav siswa) yang diperbarui otomatis.
  - Sinkronisasi otomatis: saat halaman dimuat, interval polling (±6 detik), dan event `storage` antar-tab — semua lewat `A.startNotifSync()` / `A.refreshNotifBadges()` (`js/app.js`).
  - Guru kini punya halaman & menu **Notifikasi** sendiri di sidebar (status usulan, rekomendasi terbit, serta kabar dari admin) — termasuk notifikasi langsung saat admin menyetujui/menolak usulan atau menyetujui akun guru.
  - Penandaan "dibaca" (individual / semua) kini langsung me-refresh badge di seluruh UI.
- **Area nama user di bawah sidebar dibuat statis** — tanpa klik/dropdown/chevron (popup duplikat menu profil header dihapus); menu profil tetap tersedia lewat avatar di header.
- **Glassmorphism di belakang logo** (`.auth-brand-glass`) pada panel kiri halaman Login & Registrasi (kaca buram + border + bayangan), plus pill kaca pada brand mobile; `backdrop-filter` + `-webkit-` fallback.
- **Perbaikan responsive form Login/Registrasi**: perbaikan selektor typo `.auth-grid2` → `.a-grid2` (field 2 kolom kini benar-benar menumpuk menjadi 1 kolom di <520px), tata letak ponsel kecil (<380px) untuk kartu, switch peran, tab, dan brand; halaman *recovery/centered* tidak terpotong saat keyboard Android terbuka (scroll + orbs menjadi `position: fixed`).
- **Tata letak brand halaman Login** (`css/auth.css`): lockup logo + nama SIPUS dipasang ke sisi paling atas panel kiri (`align-items: flex-start`), gap antara blok logo dengan tagline *PERPUSTAKAAN DIGITAL SEKOLAH* dilonggarkan (52px desktop / 34px layar pendek ≤920px / 22px ≤760px) — tetap bebas scroll penuh satu layar.

# SIPUS UI Refresh — v1.4.0

- **Reset kata sandi mandiri** (`forgot.html`): verifikasi Nama Lengkap + Nomor Identitas (NIS untuk siswa, NIP/NUPTK/No. Induk untuk guru) + Email terdaftar sebelum membuat kata sandi baru. Alur 2 fase (verifikasi → kata sandi baru) + layar sukses dalam satu halaman.
- Form pendaftaran **dipisah menjadi dua form terpisah**: Siswa (NIS + Kelas, langsung aktif) dan Guru (NIP + Mata Pelajaran, menunggu verifikasi admin), masing-masing dengan tab sendiri di `register.html`.
- Tombol **"Kembali ke Login" di atas form pendaftaran dihapus**; tautan masuk tetap tersedia di bawah form.
- Teks brand distandarkan menjadi *Sistem Perpustakaan* dengan susunan **3 baris di samping kanan logo** (SIPUS / Sistem Perpustakaan / SMA Swasta Pencawan) di halaman login, register, dan sidebar dashboard.
- Halaman **Profil Siswa** kini memuat **Ubah Kata Sandi** (bukan lagi menu terpisah) dan **unggah foto profil** (kompresi maks. 320px, disimpan sebagai data URL di field `foto`).
- Perbaikan **bug logout siswa**: session dibersihkan secara aman (try/catch) dan pengalihan memakai `location.replace()` agar tidak bisa kembali ke dashboard lewat tombol back.

# SIPUS UI Refresh — v1.3.0

- Logo diperbarui ke `assets/sipus-logo.png` di semua halaman (login, register, splash `index`, sidebar dashboard, header mobile, dan preferensi logo admin).
- Logo dashboard (sidebar) diputihkan lewat `filter: brightness(0) invert(1)` agar terlihat bersih di sidebar gelap — sekaligus memperbaiki bug logo yang sempat hilang saat drawer sidebar dibuka.
- Struktur teks brand baru di samping/bawah logo: **SIPUS** (tebal) / *Sistem perpustakaan* (lebih kecil) / **SMA Swasta Pencawan** (baris baru) pada halaman login, register, dan sidebar dashboard.

# SIPUS UI Refresh — v1.2.0

- Visual polish menyeluruh di halaman login, siswa, dan admin (glass topbar, gradient sidebar, hover stat card).
- Sidebar: gradien biru gelap + indikator aksen kuning pada menu aktif, hover slide.
- Topbar: efek kaca (backdrop blur) dengan bayangan lembut.
- Kartu statistik: garis gradien atas saat hover + transisi angkat.
- Hero dashboard: border glow + bayangan lebih dalam.
- Tabel: header gradien halus, sudut kartu lebih lembut.
- Toast, notifikasi, pengumuman, kartu buku, detail buku: sentuhan bayangan & ikon ber-chip.
- Halaman auth: tekstur titik halus di panel visual + garis aksen atas kartu form.
- Animasi masuk halaman (fade-up) + dukungan `prefers-reduced-motion`.
- Logo sidebar memakai `sipus-logo.png` (format raster, diputihkan dengan filter CSS di sidebar gelap).

# SIPUS UI Refresh — v1.1.0

- Branding updated to **SMA Swasta Pencawan**.
- Login redesigned to match the supplied blue/white/yellow reference direction.
- Login now separates **Siswa** and **Admin/Pustakawan** access.
- Added **Pendaftaran Siswa** at `register.html` and `/daftar`.
- Registration writes a new user + student profile + welcome notification + audit entry to localStorage.
- Student/admin routing remains compatible with the existing SPA modules.
- Book assets are also available as PNG files for consistent browser rendering.
- Added responsive layouts and entrance/floating animations on auth screens.
