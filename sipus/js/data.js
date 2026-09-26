/* ============================================================
   SIPUS — Data Layer (localStorage)
   Penyimpanan sementara untuk demo/prototype sekolah.
   Untuk produksi: ganti dengan Supabase/Firebase API.
   ============================================================ */
const DB_KEY = "sipus_db_v2";
const SMA_JURUSAN = ["IPA 1", "IPA 2", "IPA 3", "IPA 4", "IPS 1", "IPS 2", "IPS 3", "IPS 4"];

const SMK_TO_SMA = {
  "RPL 1": "IPA 1", "RPL 2": "IPA 2", "RPL 3": "IPA 3", "RPL 4": "IPA 4",
  "TKJ 1": "IPA 1", "TKJ 2": "IPA 2",
  "TBSM 1": "IPA 1", "TSM 1": "IPA 1", "TKR 1": "IPA 1", "TP 1": "IPA 1",
  "AKL 1": "IPS 1", "AKL 2": "IPS 2", "AKL 3": "IPS 3", "AKL 4": "IPS 4",
  "MM 1": "IPS 1", "MM 2": "IPS 2", "MMD 1": "IPS 1", "MMD 2": "IPS 2",
  "OTKP 1": "IPS 1", "OTKP 2": "IPS 2", "BDP 1": "IPS 1", "BDP 2": "IPS 2",
  "PMS 1": "IPS 1", "TMP 1": "IPS 1"
};

function migrateJurusan(j) {
  const t = String(j || "").trim();
  if (!t) return t;
  const m = t.match(/^(IPA|IPS)\s*[-–]?\s*(\d{0,2})$/i);
  if (m) return (m[1].toUpperCase()) + (m[2] ? " " + m[2] : " 1");
  if (SMK_TO_SMA[t]) return SMK_TO_SMA[t];
  const up = t.toUpperCase();
  const num = (up.match(/\d+/) || [""])[0];
  if (/RPL|TKJ|TBSM|TSM|TKR|\bTP\b/.test(up)) return num ? "IPA " + num : "IPA 1";
  if (/AKL|MMD?|OTKP|BDP|PMS/.test(up)) return num ? "IPS " + num : "IPS 1";
  return j;
}
const BOOK_COVERS = {
  "bk-01": "assets/books/1.jpg",
  "bk-02": "assets/books/2.jpg",
  "bk-03": "assets/books/3.jpg",
  "bk-04": "assets/books/4.jpg",
  "bk-05": "assets/books/5.jpg",
  "bk-06": "assets/books/6.jpg",
  "bk-07": "assets/books/7.jpg",
  "bk-08": "assets/books/8.jpg",
  "bk-09": "assets/books/9.jpg",
  "bk-10": "assets/books/10.jpg"
};

function uid(prefix) {
  return prefix + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

function SEED() {
  const settings = {
    id: "st-01",
    school_name: "SMA Swasta Pencawan",
    tagline: "Baca Hari Ini, Raih Masa Depan",
    loan_limit: 3,
    loan_duration: 7,
    library_hours: "Sen–Jum 07.00–16.00",
    address: "Jl. Pendidikan No. 1, Pencawan",
    contact: "perpustakaan@sipus.sch.id",
    logo_letter: "S",
    announcements: [
      { id: "an-01", title: "Selamat datang di SIPUS!",
        message: "Sekarang kamu bisa mencari buku, cek stok, dan pantau peminjaman secara online.",
        created_at: daysFromNow(-5) },
      { id: "an-02", title: "Donasi Buku Terbuka",
        message: "Perpustakaan menerima donasi buku layak baca. Hubungi pustakawan untuk info lebih lanjut.",
        created_at: daysFromNow(-2) }
    ]
  };

  const categories = [
    { id: "cat-01", name: "Teknologi Informasi", desc: "Pemrograman, jaringan, AI, dan komputer" },
    { id: "cat-02", name: "Sains", desc: "Biologi, fisika, kimia, dan IPA" },
    { id: "cat-03", name: "Sejarah", desc: "Sejarah Indonesia dan dunia" },
    { id: "cat-04", name: "Matematika", desc: "Matematika, aljabar, dan statistika" },
    { id: "cat-05", name: "Bahasa", desc: "Bahasa Indonesia dan Inggris" },
    { id: "cat-06", name: "Sastra", desc: "Sastra Indonesia dan luar negeri" },
    { id: "cat-07", name: "Manajemen", desc: "Manajemen dan kewirausahaan" }
  ];

  const books = [
    { id: "bk-01", kode: "BK001", isbn: "9789793062792", judul: "Laskar Pelangi",
      penulis: "Andrea Hirata", penerbit: "Bentang Pustaka", tahun: 2008, kategori_id: "cat-06",
      sinopsis: "Novel tentang perjuangan sepuluh anak Belitung dalam memperoleh pendidikan dan mengejar cita-cita.",
      rak: "A-01", cover: BOOK_COVERS["bk-01"], total: 8, available: 5, borrowed: 3, damaged: 0, lost: 0, kondisi: "Baik" },
    { id: "bk-02", kode: "BK002", isbn: "9789799731234", judul: "Bumi Manusia",
      penulis: "Pramoedya Ananta Toer", penerbit: "Lentera Dipantara", tahun: 2005, kategori_id: "cat-03",
      sinopsis: "Roman Tetralogi Buru yang mengikuti perjalanan Minke dan pergulatan pendidikan, kolonialisme, serta perubahan sosial di awal abad ke-20.",
      rak: "A-02", cover: BOOK_COVERS["bk-02"], total: 7, available: 3, borrowed: 4, damaged: 0, lost: 0, kondisi: "Baik" },
    { id: "bk-03", kode: "BK003", isbn: "9786020633176", judul: "Atomic Habits",
      penulis: "James Clear", penerbit: "Gramedia Pustaka Utama", tahun: 2019, kategori_id: "cat-07",
      sinopsis: "Panduan membangun kebiasaan baik melalui perubahan kecil yang konsisten dan sistem yang mudah diterapkan.",
      rak: "A-03", cover: BOOK_COVERS["bk-03"], total: 10, available: 6, borrowed: 4, damaged: 0, lost: 0, kondisi: "Baik" },
    { id: "bk-04", kode: "BK004", isbn: "9786024246945", judul: "Laut Bercerita",
      penulis: "Leila S. Chudori", penerbit: "Kepustakaan Populer Gramedia", tahun: 2017, kategori_id: "cat-06",
      sinopsis: "Novel yang mengangkat persahabatan, keluarga, kehilangan, dan pengalaman aktivis dalam latar sejarah Indonesia.",
      rak: "A-04", cover: BOOK_COVERS["bk-04"], total: 6, available: 2, borrowed: 4, damaged: 0, lost: 0, kondisi: "Baik" },
    { id: "bk-05", kode: "BK005", isbn: "9789792248616", judul: "Negeri 5 Menara",
      penulis: "Ahmad Fuadi", penerbit: "Gramedia Pustaka Utama", tahun: 2009, kategori_id: "cat-06",
      sinopsis: "Kisah persahabatan dan pendidikan enam santri yang mengejar mimpi dengan semangat belajar dan keyakinan pada cita-cita.",
      rak: "B-01", cover: BOOK_COVERS["bk-05"], total: 8, available: 5, borrowed: 3, damaged: 0, lost: 0, kondisi: "Baik" },
    { id: "bk-06", kode: "BK006", isbn: "9786020324784", judul: "Hujan",
      penulis: "Tere Liye", penerbit: "Gramedia Pustaka Utama", tahun: 2018, kategori_id: "cat-06",
      sinopsis: "Novel tentang persahabatan, cinta, perpisahan, dan proses menerima kehilangan dalam dunia masa depan.",
      rak: "B-02", cover: BOOK_COVERS["bk-06"], total: 9, available: 7, borrowed: 2, damaged: 0, lost: 0, kondisi: "Baik" },
    { id: "bk-07", kode: "BK007", isbn: "9786024242756", judul: "Pulang",
      penulis: "Leila S. Chudori", penerbit: "Gramedia Pustaka Utama", tahun: 2022, kategori_id: "cat-06",
      sinopsis: "Drama keluarga, persahabatan, cinta, dan pengkhianatan yang berlatar tiga peristiwa bersejarah Indonesia.",
      rak: "B-03", cover: BOOK_COVERS["bk-07"], total: 6, available: 4, borrowed: 2, damaged: 0, lost: 0, kondisi: "Baik" },
    { id: "bk-08", kode: "BK008", isbn: "9780062316103", judul: "Sapiens",
      penulis: "Yuval Noah Harari", penerbit: "Harper Perennial", tahun: 2015, kategori_id: "cat-03",
      sinopsis: "Gambaran luas sejarah manusia dari munculnya Homo sapiens hingga perkembangan masyarakat modern.",
      rak: "C-01", cover: BOOK_COVERS["bk-08"], total: 5, available: 3, borrowed: 2, damaged: 0, lost: 0, kondisi: "Baik" },
    { id: "bk-09", kode: "BK009", isbn: "9780152465032", judul: "The Little Prince",
      penulis: "Antoine de Saint-Exupéry", penerbit: "Harcourt", tahun: 1943, kategori_id: "cat-05",
      sinopsis: "Kisah alegoris tentang persahabatan, tanggung jawab, dan cara memandang kehidupan melalui perjalanan seorang pangeran kecil.",
      rak: "C-02", cover: BOOK_COVERS["bk-09"], total: 5, available: 4, borrowed: 1, damaged: 0, lost: 0, kondisi: "Baik" },
    { id: "bk-10", kode: "BK010", isbn: "9786020667188", judul: "Kebiasaan Atom",
      penulis: "James Clear", penerbit: "Gramedia Pustaka Utama", tahun: 2023, kategori_id: "cat-07",
      sinopsis: "Edisi Indonesia Atomic Habits yang membahas perubahan kecil, pembentukan rutinitas, dan peningkatan diri.",
      rak: "C-03", cover: BOOK_COVERS["bk-10"], total: 7, available: 5, borrowed: 2, damaged: 0, lost: 0, kondisi: "Baik" }
  ];

  // Username / password akun demo: Siswa 2025101 / siswa123; Guru guru / guru123; Admin admin / admin123.
  const users = [
    { id: "usr-01", username: "admin", password: "admin123", role: "admin", status: "Aktif", name: "Pustakawan SIPUS" },
    { id: "usr-08", username: "guru", password: "guru123", role: "guru", status: "Aktif", name: "Bu Sari Dewi, S.Pd" },
    { id: "usr-02", username: "2025101", password: "siswa123", role: "siswa", status: "Aktif", name: "Aulia Ramadhani" },
    { id: "usr-03", username: "2025102", password: "siswa123", role: "siswa", status: "Aktif", name: "Bima Pratama" },
    { id: "usr-04", username: "2025103", password: "siswa123", role: "siswa", status: "Aktif", name: "Citra Lestari" },
    { id: "usr-05", username: "2025104", password: "siswa123", role: "siswa", status: "Aktif", name: "Dimas Saputra" },
    { id: "usr-06", username: "2025105", password: "siswa123", role: "siswa", status: "Aktif", name: "Eka Wulandari" },
    { id: "usr-07", username: "2025106", password: "siswa123", role: "siswa", status: "Nonaktif", name: "Fajar Nugraha" }
  ];

  const students = [
    { id: "std-01", user_id: "usr-02", nis: "2025101", nama: "Aulia Ramadhani", kelas: "XI", jurusan: "IPA 1", gender: "P", kontak: "0812-3456-7890", email: "aulia@sipus.sch.id", foto: "" },
    { id: "std-02", user_id: "usr-03", nis: "2025102", nama: "Bima Pratama", kelas: "XI", jurusan: "IPA 2", gender: "L", kontak: "0813-1234-5678", email: "bima@sipus.sch.id", foto: "" },
    { id: "std-03", user_id: "usr-04", nis: "2025103", nama: "Citra Lestari", kelas: "X", jurusan: "IPS 1", gender: "P", kontak: "0814-9876-5432", email: "citra@sipus.sch.id", foto: "" },
    { id: "std-04", user_id: "usr-05", nis: "2025104", nama: "Dimas Saputra", kelas: "XII", jurusan: "IPA 1", gender: "L", kontak: "0815-1111-2222", email: "dimas@sipus.sch.id", foto: "" },
    { id: "std-05", user_id: "usr-06", nis: "2025105", nama: "Eka Wulandari", kelas: "XI", jurusan: "IPS 2", gender: "P", kontak: "0816-3333-4444", email: "eka@sipus.sch.id", foto: "" },
    { id: "std-06", user_id: "usr-07", nis: "2025106", nama: "Fajar Nugraha", kelas: "X", jurusan: "IPA 3", gender: "L", kontak: "0817-5555-6666", email: "fajar@sipus.sch.id", foto: "" }
  ];

  const teacher_profiles = [
    { id: "tch-01", user_id: "usr-08", nip: "1967123424001201", nama: "Bu Sari Dewi, S.Pd", mapel: "Bahasa Indonesia", kelas: "X, XI, XII", email: "sari.dewi@pencawan.sch.id", no_hp: "0812-3456-7890", foto: "" }
  ];

  const book_requests = [
    { id: "req-01", teacher_id: "tch-01", type: "rekomendasi", title: "Filosofi Teras", author: "Henry Manampiring", publisher: "Kompas", isbn: "", year: 2019, category_id: "cat-07", cover: "", target_class: "X - XII", reason: "Bacaan pengembangan diri dan pengenalan filsafat praktis.", status: "approved", created_at: daysFromNow(-8), reviewed_at: daysFromNow(-6), review_note: "Rekomendasi diterima dan ditampilkan di katalog guru." },
    { id: "req-02", teacher_id: "tch-01", type: "karya_sendiri", title: "Modul Literasi Digital untuk Remaja", author: "Bu Sari Dewi, S.Pd", publisher: "SIPUS Sekolah", isbn: "", year: 2026, category_id: "cat-01", cover: "", target_class: "X - XI", reason: "Modul buatan guru untuk mendampingi siswa memahami etika dan keamanan digital.", status: "pending", created_at: daysFromNow(-1), reviewed_at: null, review_note: "" }
  ];

  const recommendations = [
    { id: "rec-01", teacher_id: "tch-01", book_id: "bk-03", title: "Atomic Habits", author: "James Clear", category: "Pengembangan Diri", target_class: "X - XII", reason: "Membantu siswa membangun kebiasaan belajar yang konsisten.", status: "published", created_at: daysFromNow(-10) },
    { id: "rec-02", teacher_id: "tch-01", book_id: "bk-01", title: "Laskar Pelangi", author: "Andrea Hirata", category: "Sastra", target_class: "X - XII", reason: "Cocok untuk diskusi literasi, pendidikan, dan semangat belajar.", status: "published", created_at: daysFromNow(-7) }
  ];

  const loans = [
    { id: "loan-01", loan_code: "PJM-0001", student_id: "std-01", book_id: "bk-02",
      loan_date: daysFromNow(-5), due_date: daysFromNow(2), return_date: null,
      status: "active", condition_out: "Baik", processed_by: "admin", note: "" },
    { id: "loan-02", loan_code: "PJM-0002", student_id: "std-01", book_id: "bk-03",
      loan_date: daysFromNow(-8), due_date: daysFromNow(-1), return_date: null,
      status: "overdue", condition_out: "Baik", processed_by: "admin", note: "" },
    { id: "loan-03", loan_code: "PJM-0003", student_id: "std-02", book_id: "bk-01",
      loan_date: daysFromNow(-3), due_date: daysFromNow(4), return_date: null,
      status: "active", condition_out: "Baik", processed_by: "admin", note: "" },
    { id: "loan-04", loan_code: "PJM-0004", student_id: "std-03", book_id: "bk-07",
      loan_date: daysFromNow(-10), due_date: daysFromNow(-3), return_date: null,
      status: "overdue", condition_out: "Baik", processed_by: "admin", note: "" },
    { id: "loan-05", loan_code: "PJM-0005", student_id: "std-04", book_id: "bk-08",
      loan_date: daysFromNow(-12), due_date: daysFromNow(-5), return_date: daysFromNow(-2),
      status: "returned", condition_out: "Baik", processed_by: "admin", condition_in: "Baik", note: "" },
    { id: "loan-06", loan_code: "PJM-0006", student_id: "std-01", book_id: "bk-05",
      loan_date: daysFromNow(-20), due_date: daysFromNow(-13), return_date: daysFromNow(-14),
      status: "returned", condition_out: "Baik", processed_by: "admin", condition_in: "Baik", note: "" },
    { id: "loan-07", loan_code: "PJM-0007", student_id: "std-05", book_id: "bk-03",
      loan_date: daysFromNow(-2), due_date: daysFromNow(5), return_date: null,
      status: "active", condition_out: "Baik", processed_by: "admin", note: "" },
    { id: "loan-08", loan_code: "PJM-0008", student_id: "std-01", book_id: "bk-04",
      loan_date: daysFromNow(-30), due_date: daysFromNow(-23), return_date: daysFromNow(-24),
      status: "returned", condition_out: "Baik", processed_by: "admin", condition_in: "Baik", note: "" },
    { id: "loan-09", loan_code: "PJM-0009", student_id: "std-02", book_id: "bk-05",
      loan_date: daysFromNow(-1), due_date: daysFromNow(6), return_date: null,
      status: "active", condition_out: "Baik", processed_by: "admin", note: "" },
    { id: "loan-10", loan_code: "PJM-0010", student_id: "std-03", book_id: "bk-02",
      loan_date: daysFromNow(-6), due_date: daysFromNow(1), return_date: null,
      status: "active", condition_out: "Baik", processed_by: "admin", note: "" }
  ];

  const favorites = [
    { id: "fav-01", student_id: "std-01", book_id: "bk-04", created_at: daysFromNow(-3) },
    { id: "fav-02", student_id: "std-01", book_id: "bk-01", created_at: daysFromNow(-2) },
    { id: "fav-03", student_id: "std-02", book_id: "bk-02", created_at: daysFromNow(-1) }
  ];

  const notifications = [
    { id: "ntf-01", student_id: "std-01", type: "due", title: "Buku hampir jatuh tempo",
      message: "Buku 'Kecerdasan Buatan' jatuh tempo pada 2 hari lagi. Segera kembalikan ya.",
      is_read: false, created_at: daysFromNow(0) },
    { id: "ntf-02", student_id: "std-01", type: "late", title: "Pengembalian terlambat",
      message: "Buku 'Manajemen Siswa' melewati jatuh tempo. Segera kembalikan ke perpustakaan.",
      is_read: false, created_at: daysFromNow(0) },
    { id: "ntf-03", student_id: "std-01", type: "system", title: "Selamat bergabung di SIPUS",
      message: "Akun kamu aktif. Jelajahi katalog dan mulai membaca!",
      is_read: true, created_at: daysFromNow(-6) },
    { id: "ntf-04", student_id: "std-02", type: "due", title: "Pengingat pengembalian",
      message: "Buku 'Pemrograman Web' akan jatuh tempo dalam beberapa hari.",
      is_read: false, created_at: daysFromNow(-1) },
    { id: "ntf-05", teacher_id: "tch-01", type: "system", title: "Usulan buku disetujui",
      message: "Usulan berjudul \"Filosofi Teras\" telah disetujui dan dipublikasikan ke katalog.",
      is_read: false, created_at: daysFromNow(-1) }
  ];

  const audit_logs = [
    { id: "au-01", user_id: "usr-01", action: "Login", module: "Auth", detail: "Admin login", created_at: daysFromNow(-1) },
    { id: "au-02", user_id: "usr-01", action: "Ubah", module: "Buku", detail: "Update stok BK002", created_at: daysFromNow(-1) }
  ];

  return {
    settings, categories, books, users, students, teacher_profiles, loans, favorites, notifications, audit_logs, book_requests, recommendations,
    meta: { seeded_at: new Date().toISOString(), version: "2.0.0" }
  };
}

function getDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const db = JSON.parse(raw);
      let changed = false;
      db.teacher_profiles = db.teacher_profiles || [];
      db.book_requests = db.book_requests || [];
      db.recommendations = db.recommendations || [];
      if (db.settings && db.settings.school_name === "SMAN 1 Nusantara") {
        db.settings.school_name = "SMA Swasta Pencawan";
        db.settings.tagline = "Baca Hari Ini, Raih Masa Depan";
        changed = true;
      }
      (db.students || []).forEach(st => {
        const newJur = migrateJurusan(st.jurusan);
        if (newJur !== st.jurusan) { st.jurusan = newJur; changed = true; }
        if (st.kelas && /(IPA|IPS)\s*\d+$/i.test(String(st.kelas))) {
          const k2 = String(st.kelas).replace(/\s*(IPA|IPS)\s*\d+$/i, "");
          if (k2 !== st.kelas) { st.kelas = k2; changed = true; }
        }
      });
      db.books.forEach(book => {
        const staleCover = !book.cover
          || book.cover.indexOf("assets/books/") === 0
          || book.cover.indexOf("https://covers.openlibrary.org/") === 0
          || book.cover.indexOf("https://books.google.com/") === 0;
        if (staleCover && BOOK_COVERS[book.id]) {
          book.cover = BOOK_COVERS[book.id];
          changed = true;
        }
      });
      if (changed) localStorage.setItem(DB_KEY, JSON.stringify(db));
      return db;
    }
  } catch (e) { console.warn("DB corrupt, reseed", e); }
  const db = SEED();
  db.books.forEach(book => { book.cover = BOOK_COVERS[book.id] || ""; });
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  return db;
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function resetDB() {
  localStorage.removeItem(DB_KEY);
  return getDB();
}

function getSetting(key) {
  const db = getDB();
  const s = db.settings || {};
  return s[key] !== undefined ? s[key] : "";
}

function todayStr() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function isOverdue(l) {
  if (l.status !== "active" && l.status !== "overdue") return false;
  return new Date(l.due_date).getTime() < Date.now();
}

function syncOverdue(db) {
  let changed = false;
  db.loans.forEach(l => {
    if (l.status !== "active" && l.status !== "overdue") return;
    const od = isOverdue(l);
    if (od && l.status !== "overdue") { l.status = "overdue"; changed = true; }
    else if (!od && l.status !== "active") { l.status = "active"; changed = true; }
  });
  if (changed) saveDB(db);
  return db;
}

/* ---------- Helper lookups ---------- */
function bookById(id) {
  return getDB().books.find(b => b.id === id) || null;
}

function categoryName(id) {
  const c = getDB().categories.find(x => x.id === id);
  return c ? c.name : "Umum";
}

function studentById(id) {
  return getDB().students.find(s => s.id === id) || null;
}

function bookStatus(b) {
  if (b.available === 0) return { label: "Dipinjam Semua", type: "danger" };
  if (b.available <= 2) return { label: "Stok Terbatas", type: "warning" };
  return { label: "Tersedia", type: "success" };
}

function loanStatusInfo(l) {
  const now = new Date();
  const due = new Date(l.due_date);
  const diff = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  switch (l.status) {
    case "active":
      if (diff < 0) return { label: "Terlambat", type: "danger", diff };
      if (diff <= 2) return { label: `Jatuh tempo ${diff === 0 ? "hari ini" : `${diff} hari lagi`}`, type: "warning", diff };
      return { label: `Sisa ${diff} hari`, type: "success", diff };
    case "overdue":
      return { label: `Terlambat ${Math.abs(diff)} hari`, type: "danger", diff };
    case "requested":
      return { label: "Menunggu Disetujui", type: "primary", diff };
    case "approved":
      return { label: "Disetujui", type: "success", diff };
    case "returned":
      return { label: "Dikembalikan", type: "neutral", diff };
    case "rejected":
      return { label: "Ditolak", type: "danger", diff };
    default:
      return { label: l.status, type: "neutral", diff };
  }
}

/* ---------- Icons (inline SVG) ---------- */
const ICONS = {
  home: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></svg>',
  book: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  loan: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M19 17V7M16 10.5v3M10 10.5v3"/></svg>',
  history: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 3"/></svg>',
  favorite: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  bell: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  user: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  lock: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  help: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5"/></svg>',
  dashboard: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  grid: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>',
  users: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  return: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/></svg>',
  report: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="7"/><rect x="12" y="6" width="3" height="11"/><rect x="17" y="13" width="3" height="4"/></svg>',
  settings: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  search: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
  plus: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  edit: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>',
  trash: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
  check: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  x: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  eye: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>',
  logout: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
  clock: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  box: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/></svg>',
  zap: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
  arrowRight: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
  calendar: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  star: '<svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>',
  info: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  menu: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>',
  alert: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  megaphone: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v3a1 1 0 0 0 1 1h2l3 4a1 1 0 0 0 2-1v-13a1 1 0 0 0-2-1L6 7H4a1 1 0 0 0-1 1z"/><path d="M20 8a5 5 0 0 1 0 8M15.5 8.5a3 3 0 0 1 0 7"/></svg>',
  upload: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/></svg>',
  sparkle: '<svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 5.7L20 9.8l-5 3.9 1.7 6.3L12 16.6 7.3 20l1.7-6.3-5-3.9 6.1-2.1z"/></svg>'
};

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateLong(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} hari lalu`;
  return fmtDate(iso);
}

/* ---------- Export ---------- */
window.SIPUS = {
  DB_KEY, SMA_JURUSAN, migrateJurusan, uid, daysFromNow, getDB, saveDB, resetDB, getSetting,
  todayStr, isOverdue, syncOverdue, bookById, categoryName, studentById,
  bookStatus, loanStatusInfo, ICONS, esc, fmtDate, fmtDateLong, timeAgo
};