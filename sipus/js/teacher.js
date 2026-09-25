/* ============================================================
   SIPUS — Portal Guru (SPA)
   Fitur: Dashboard, Katalog, Usulan Buku, Rekomendasi Siswa,
          Data Peminjaman, Profil
   ============================================================ */
(function () {
  const S = window.SIPUS;
  const A = window.APP;
  const { getDB, saveDB, ICONS, esc, fmtDate, timeAgo, bookById, categoryName, bookStatus, uid } = S;

  let state = { view: "dashboard", q: "" };

  function db() { return getDB(); }
  function session() { return A.getSession(); }
  function profile() {
    const s = session();
    return db().teacher_profiles.find(t => t.user_id === s.user_id) || null;
  }
  function teacherId() { const p = profile(); return p ? p.id : ""; }
  function teacherRequests() { return (db().book_requests || []).filter(r => r.teacher_id === teacherId()); }
  function teacherRecs() { return (db().recommendations || []).filter(r => r.teacher_id === teacherId()); }

  const NAV_ITEMS = [
    { label: "Utama", key: "dashboard", icon: "dashboard", text: "Dashboard" },
    { key: "katalog", icon: "book", text: "Katalog Buku" },
    { label: "Kontribusi", key: "usulan", icon: "plus", text: "Usulan Buku" },
    { key: "rekomendasi", icon: "favorite", text: "Rekomendasi Siswa" },
    { label: "Aktivitas", key: "peminjaman", icon: "loan", text: "Peminjaman" },
    { key: "profil", icon: "user", text: "Profil Guru" },
    { key: "keluar", icon: "logout", text: "Keluar" }
  ];

  const TITLES = {
    dashboard: "Dashboard Guru", katalog: "Katalog Buku", usulan: "Usulan Buku",
    rekomendasi: "Rekomendasi untuk Siswa", peminjaman: "Aktivitas Peminjaman", profil: "Profil Guru"
  };

  function renderLayout() {
    const s = session();
    const unread = A.notifBadgeFor(s);
    const sidebar = A.buildSidebar(NAV_ITEMS, state.view, s);
    const topbar = A.buildTopbar(TITLES[state.view] || "Portal Guru", unread);
    A.setAppShell(`${sidebar}<main class="main">${topbar}<div class="content" id="content"></div></main>`);
    A.afterLayout({
      onNotif: () => {},
      onNotifDropdown: (panel) => { panel.innerHTML = buildTeacherNotifPanel(); },
      onAvatar: () => go("profil"),
      profileMenu: [
        { key: "profil", icon: "user", text: "Profil Guru" },
        { key: "keluar", icon: "logout", text: "Keluar" }
      ],
      onSearch: q => { state.q = q; go("katalog"); }
    });
    A.startNotifSync();
  }

  function buildTeacherNotifPanel() {
    const t = profile();
    const items = [];
    (db().notifications || []).filter(n => n.teacher_id === (t ? t.id : "")).slice(0, 6).forEach(n => {
      const ai = { due: "⏰", late: "🚨", system: "💬", news: "📢", info: "💡" };
      items.push(`<div class="np-item ${n.is_read ? "" : "unread"}">
        <span class="np-icon">${ai[n.type] || ai.info}</span>
        <div class="np-body"><b>${esc(n.title)}</b><p>${esc(n.message)}</p><div class="time">${timeAgo(n.created_at)}</div></div>
      </div>`);
    });
    if (!items.length) items.push(`<div class="np-item"><span class="np-icon">${ICONS.bell}</span><div class="np-body"><b>Tidak ada notifikasi</b><p>Semua aman.</p></div></div>`);
    return `
      <div class="np-head"><b>Notifikasi Guru</b></div>
      <div class="np-list">${items.join("")}</div>
      <div class="np-foot"><span class="muted text-xs">Kabar dari admin akan muncul di sini.</span></div>`;
  }

  function render(html) { document.getElementById("content").innerHTML = html; }
  function go(key) { if (window.__NAV__[key]) window.__NAV__[key](); }
  function logout() {
    A.confirmDialog("Keluar", "Yakin ingin keluar dari Portal Guru?", () => { A.clearSession(); location.href = "login.html"; }, { danger: true, yesLabel: "Keluar" });
  }

  window.__NAV__ = {
    dashboard: () => { state.view = "dashboard"; renderLayout(); renderDashboard(); window.scrollTo(0,0); },
    katalog: () => { state.view = "katalog"; renderLayout(); renderKatalog(); window.scrollTo(0,0); },
    usulan: () => { state.view = "usulan"; renderLayout(); renderUsulan(); window.scrollTo(0,0); },
    rekomendasi: () => { state.view = "rekomendasi"; renderLayout(); renderRekomendasi(); window.scrollTo(0,0); },
    peminjaman: () => { state.view = "peminjaman"; renderLayout(); renderPeminjaman(); window.scrollTo(0,0); },
    profil: () => { state.view = "profil"; renderLayout(); renderProfil(); window.scrollTo(0,0); },
    keluar: logout
  };

  function renderDashboard() {
    const dbx = db(), p = profile();
    const reqs = teacherRequests(), recs = teacherRecs();
    const pending = reqs.filter(r => r.status === "pending").length;
    const published = recs.filter(r => r.status === "published").length;
    const books = dbx.books.length;
    const activeLoans = dbx.loans.filter(l => ["active","overdue"].includes(l.status)).length;
    render(`
      <div class="teacher-hero">
        <div style="position:relative;z-index:1;max-width:640px;">
          <div class="role-pill" style="background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.2);">👩‍🏫 Portal Guru</div>
          <h2 style="font-size:28px;margin:12px 0 7px;">Halo, ${esc((p ? p.nama : session().name).split(",")[0])}! 👋</h2>
          <p style="opacity:.9;">Kelola kontribusi literasi, usulkan buku karya sendiri, dan bantu siswa menemukan bacaan yang relevan.</p>
          <div class="flex gap-8 mt-16 flex-wrap">
            <button class="btn btn-accent" onclick="window.__NAV__.usulan()">${ICONS.plus} Ajukan Buku</button>
            <button class="btn btn-ghost" style="background:#fff;color:var(--primary);" onclick="window.__NAV__.rekomendasi()">${ICONS.favorite} Rekomendasikan</button>
          </div>
        </div>
        <img class="teacher-hero-art" src="assets/student-reading.svg" alt="Ilustrasi membaca">
      </div>

      <div class="stat-grid mt-16">
        <div class="stat-card"><div class="stat-icon blue">${ICONS.book}</div><div><div class="stat-info"><div class="num">${books}</div><div class="lbl">Total Koleksi</div></div></div></div>
        <div class="stat-card"><div class="stat-icon orange">${ICONS.clock}</div><div><div class="stat-info"><div class="num">${pending}</div><div class="lbl">Usulan Menunggu</div></div></div></div>
        <div class="stat-card"><div class="stat-icon green">${ICONS.favorite}</div><div><div class="stat-info"><div class="num">${published}</div><div class="lbl">Rekomendasi Aktif</div></div></div></div>
        <div class="stat-card"><div class="stat-icon yellow">${ICONS.loan}</div><div><div class="stat-info"><div class="num">${activeLoans}</div><div class="lbl">Peminjaman Aktif</div></div></div></div>
      </div>

      <div class="grid mt-16" style="grid-template-columns:1.2fr 1fr;gap:18px;" id="teacherGrid">
        <div class="section">
          <div class="section-head"><h3>Aktivitas Usulan Terbaru</h3><a class="link" style="cursor:pointer;" onclick="window.__NAV__.usulan()">Lihat semua</a></div>
          ${(reqs.slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,4).map(r => requestMini(r)).join("")) || A.emptyState("📚","Belum ada usulan","Ajukan buku karya sendiri atau rekomendasikan buku dari katalog.")}
        </div>
        <div class="section">
          <div class="section-head"><h3>Rekomendasi Aktif</h3><a class="link" style="cursor:pointer;" onclick="window.__NAV__.rekomendasi()">Kelola</a></div>
          ${recs.filter(r=>r.status==="published").slice(0,4).map(r => recommendationMini(r)).join("") || A.emptyState("💡","Belum ada rekomendasi","Pilih buku yang cocok untuk siswa.")}
        </div>
      </div>`);
    if (window.innerWidth <= 900) {
      const g = document.getElementById("teacherGrid"); if (g) g.style.gridTemplateColumns = "1fr";
    }
  }

  function requestMini(r) {
    const [label, type] = r.status === "approved" ? ["Disetujui","success"] : r.status === "rejected" ? ["Ditolak","danger"] : ["Menunggu","warning"];
    return `<div class="loan-item">
      <div class="info"><b>${esc(r.title)}</b><span>${r.type === "karya_sendiri" ? "Karya sendiri" : "Rekomendasi"} • ${timeAgo(r.created_at)}</span></div>
      <span class="badge badge-${type}">${label}</span>
    </div>`;
  }
  function recommendationMini(r) {
    return `<div class="loan-item">
      <div class="info"><b>${esc(r.title)}</b><span>${esc(r.target_class || "Semua kelas")} • ${esc(r.reason || "")}</span></div>
      <span class="badge badge-success">Aktif</span>
    </div>`;
  }

  function renderKatalog() {
    const dbx = db();
    const q = state.q.toLowerCase();
    const list = dbx.books.filter(b => !q || [b.judul,b.penulis,b.isbn,b.kode,categoryName(b.kategori_id)].join(" ").toLowerCase().includes(q));
    render(`
      <div class="page-head flex justify-between items-center flex-wrap gap-8">
        <div><h1>Katalog Buku</h1><p>Cari buku untuk dibaca atau direkomendasikan kepada siswa.</p></div>
        <button class="btn btn-accent" onclick="window.__NAV__.rekomendasi()">${ICONS.favorite} Rekomendasikan Buku</button>
      </div>
      <div class="search-bar mb-16" style="max-width:520px;">${ICONS.search}<input id="teacherSearch" value="${esc(state.q)}" placeholder="Cari judul, penulis, ISBN, kategori..."></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;">
        ${list.map(b => `<div class="card card-hover" data-book="${b.id}" style="cursor:pointer;padding:12px;">
          <img src="${esc(b.cover || "assets/books/book-fallback.svg")}" style="width:100%;height:220px;object-fit:cover;border-radius:10px;" alt="${esc(b.judul)}">
          <div style="margin-top:10px;"><b style="display:block;">${esc(b.judul)}</b><span class="sub">${esc(b.penulis)}</span></div>
          <div class="flex justify-between items-center mt-8"><span class="badge badge-primary">${esc(categoryName(b.kategori_id))}</span><span class="text-xs">${b.available}/${b.total}</span></div>
        </div>`).join("") || `<div class="card center muted">Buku tidak ditemukan.</div>`}
      </div>`);
    const inp = document.getElementById("teacherSearch");
    if (inp) inp.oninput = e => { state.q = e.target.value; renderKatalog(); };
    document.querySelectorAll("[data-book]").forEach(el => el.onclick = () => showBook(el.dataset.book));
  }

  function showBook(id) {
    const b = bookById(id);
    if (!b) return;
    A.openModal(`Detail Buku — ${b.kode}`, `
      <div class="grid" style="grid-template-columns:140px 1fr;gap:18px;">
        <img class="cover-preview" style="width:140px;height:190px;" src="${esc(b.cover || "assets/books/book-fallback.svg")}" alt="">
        <div><h2 style="font-size:21px;">${esc(b.judul)}</h2><p class="muted">${esc(b.penulis)} • ${b.tahun}</p>
          <p class="text-sm mt-12">${esc(b.sinopsis || "Belum ada sinopsis.")}</p>
          <div class="flex gap-8 mt-16"><span class="badge badge-primary">${esc(categoryName(b.kategori_id))}</span><span class="badge badge-success">${b.available} tersedia</span></div>
          <button class="btn btn-accent btn-sm mt-16" id="recommendThis">${ICONS.favorite} Rekomendasikan ke Siswa</button>
        </div>
      </div>`, { onOpen: ov => ov.querySelector("#recommendThis").onclick = () => { ov.close(); recommendationForm(id); }});
  }

  function renderUsulan() {
    const reqs = teacherRequests().slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    render(`
      <div class="page-head flex justify-between items-center flex-wrap gap-8">
        <div><h1>Usulan Buku</h1><p>Ajukan karya sendiri atau sampaikan rekomendasi buku yang perlu tersedia di perpustakaan.</p></div>
        <button class="btn" id="newRequest">${ICONS.plus} Buat Usulan</button>
      </div>
      <div class="grid" style="gap:12px;">
        ${reqs.map(r => `<div class="card request-card ${r.status}">
          <div class="flex justify-between gap-12 flex-wrap">
            <div><span class="role-pill">${r.type==="karya_sendiri"?"✍️ Karya Sendiri":"📚 Rekomendasi Buku"}</span><h3 style="margin-top:8px;">${esc(r.title)}</h3><p class="muted text-sm">${esc(r.author || "-")} • ${r.year || "-"} • target ${esc(r.target_class || "-")}</p></div>
            <span class="badge badge-${r.status==="approved"?"success":r.status==="rejected"?"danger":"warning"}">${r.status==="approved"?"Disetujui":r.status==="rejected"?"Ditolak":"Menunggu"}</span>
          </div>
          <p class="text-sm mt-12">${esc(r.reason || "-")}</p>
          ${r.review_note ? `<div class="alert alert-info mt-12" style="margin-bottom:0;">Catatan admin: ${esc(r.review_note)}</div>` : ""}
        </div>`).join("") || `<div class="card center muted">Belum ada usulan.</div>`}
      </div>`);
    document.getElementById("newRequest").onclick = () => requestForm();
  }

  function requestForm() {
    const dbx = db();
    const cats = dbx.categories;
    A.openModal("Buat Usulan Buku", `
      <form id="requestForm">
        <div class="login-type-switch" id="reqType">
          <button type="button" class="active" data-v="karya_sendiri">Karya Sendiri</button>
          <button type="button" data-v="rekomendasi">Rekomendasi Buku</button>
        </div>
        <div class="field"><label>Judul Buku *</label><input class="input" id="rTitle" required></div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label>Penulis *</label><input class="input" id="rAuthor" value="${esc(profile()?.nama || session().name)}" required></div>
          <div class="field"><label>Penerbit</label><input class="input" id="rPublisher"></div>
        </div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label>Tahun</label><input class="input" id="rYear" type="number" value="${new Date().getFullYear()}"></div>
          <div class="field"><label>ISBN</label><input class="input" id="rIsbn"></div>
        </div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label>Kategori</label><select class="select" id="rCat">${cats.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div>
          <div class="field"><label>Target Kelas</label><input class="input" id="rTarget" value="${esc(profile()?.kelas || "X - XII")}"></div>
        </div>
        <div class="field"><label>Alasan / Sinopsis</label><textarea class="textarea" id="rReason" placeholder="Jelaskan mengapa buku ini cocok untuk siswa..."></textarea></div>
        <div class="field"><label>Kover Buku</label><input class="input" type="file" id="rCover" accept="image/*"><small class="muted text-xs">Opsional. Maks. 2,5 MB.</small></div>
        <div class="flex justify-end gap-12"><button type="button" class="btn btn-outline btn-sm" id="reqClose">Batal</button><button class="btn btn-sm" type="submit">Kirim Usulan</button></div>
      </form>`, {
      onOpen: ov => {
        let type = "karya_sendiri", cover = "";
        ov.querySelectorAll("#reqType button").forEach(btn => btn.onclick = () => {
          type = btn.dataset.v;
          ov.querySelectorAll("#reqType button").forEach(x => x.classList.toggle("active", x === btn));
          if (type === "rekomendasi") {
            ov.querySelector("#rTitle").placeholder = "Contoh: Filosofi Teras";
            ov.querySelector("#rAuthor").placeholder = "Penulis buku";
          } else {
            ov.querySelector("#rTitle").placeholder = "";
            ov.querySelector("#rAuthor").value = profile()?.nama || session().name;
          }
        });
        ov.querySelector("#rCover").onchange = () => {
          const file = ov.querySelector("#rCover").files[0];
          if (!file) return;
          if (!file.type.startsWith("image/") || file.size > 2.5*1024*1024) { A.toast("warning","Kover tidak valid","Gunakan gambar maksimal 2,5 MB."); return; }
          const reader = new FileReader(); reader.onload = () => cover = reader.result; reader.readAsDataURL(file);
        };
        ov.querySelector("#reqClose").onclick = ov.close;
        ov.querySelector("#requestForm").onsubmit = e => {
          e.preventDefault();
          const title = ov.querySelector("#rTitle").value.trim(), author = ov.querySelector("#rAuthor").value.trim();
          if (!title || !author) { A.toast("warning","Data belum lengkap","Judul dan penulis wajib diisi."); return; }
          const d = db();
          d.book_requests.unshift({
            id: uid("req-"), teacher_id: teacherId(), type, title, author,
            publisher: ov.querySelector("#rPublisher").value.trim(),
            isbn: ov.querySelector("#rIsbn").value.trim(),
            year: parseInt(ov.querySelector("#rYear").value) || new Date().getFullYear(),
            category_id: ov.querySelector("#rCat").value,
            cover, target_class: ov.querySelector("#rTarget").value.trim(),
            reason: ov.querySelector("#rReason").value.trim(),
            status: "published", created_at: new Date().toISOString(), reviewed_at: null, review_note: ""
          });
          saveDB(d); ov.close(); A.toast("success","Usulan terkirim","Admin akan meninjau usulanmu."); renderUsulan();
        };
      }
    });
  }

  function renderRekomendasi() {
    const recs = teacherRecs().slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    const dbx = db();
    render(`
      <div class="page-head flex justify-between items-center flex-wrap gap-8">
        <div><h1>Rekomendasi untuk Siswa</h1><p>Pilih buku dari katalog lalu jelaskan kelas dan alasan rekomendasinya.</p></div>
        <button class="btn" id="newRec">${ICONS.plus} Buat Rekomendasi</button>
      </div>
      <div class="grid" style="gap:12px;">
        ${recs.map(r => `<div class="card request-card ${r.status==="published"?"approved":"pending"}">
          <div class="flex justify-between gap-12 flex-wrap"><div><span class="role-pill">👩‍🏫 Rekomendasi Guru</span><h3 style="margin-top:8px;">${esc(r.title)}</h3><p class="muted text-sm">${esc(r.author)} • target ${esc(r.target_class)}</p></div><span class="badge badge-${r.status==="published"?"success":"warning"}">${r.status==="published"?"Tayang":"Menunggu"}</span></div>
          <p class="text-sm mt-12">${esc(r.reason || "-")}</p>
        </div>`).join("") || `<div class="card center muted">Belum ada rekomendasi.</div>`}
      </div>`);
    document.getElementById("newRec").onclick = () => recommendationForm();
  }

  function recommendationForm(bookId) {
    const dbx = db();
    const books = dbx.books;
    A.openModal("Rekomendasikan Buku untuk Siswa", `
      <form id="recForm">
        <div class="field"><label>Pilih Buku *</label><select class="select" id="recBook">${books.map(b=>`<option value="${b.id}" ${bookId===b.id?"selected":""}>${esc(b.judul)} — ${esc(b.penulis)}</option>`).join("")}</select></div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label>Target Kelas</label><input class="input" id="recTarget" value="${esc(profile()?.kelas || "X - XII")}"></div>
          <div class="field"><label>Kategori / Fokus</label><input class="input" id="recCategory" value="Literasi"></div>
        </div>
        <div class="field"><label>Alasan Rekomendasi *</label><textarea class="textarea" id="recReason" placeholder="Contoh: membantu siswa memahami kebiasaan belajar..."></textarea></div>
        <div class="flex justify-end gap-12"><button type="button" class="btn btn-outline btn-sm" id="recClose">Batal</button><button class="btn btn-sm" type="submit">Kirim Rekomendasi</button></div>
      </form>`, {
      onOpen: ov => {
        ov.querySelector("#recClose").onclick = ov.close;
        ov.querySelector("#recForm").onsubmit = e => {
          e.preventDefault();
          const book = db().books.find(b=>b.id===ov.querySelector("#recBook").value);
          const reason = ov.querySelector("#recReason").value.trim();
          if (!book || !reason) { A.toast("warning","Alasan wajib diisi","Jelaskan manfaat buku untuk siswa."); return; }
          const d = db();
          d.recommendations.unshift({
            id: uid("rec-"), teacher_id: teacherId(), book_id: book.id, title: book.judul, author: book.penulis,
            category: ov.querySelector("#recCategory").value.trim() || categoryName(book.kategori_id),
            target_class: ov.querySelector("#recTarget").value.trim() || "X - XII",
            reason, status: "published", created_at: new Date().toISOString()
          });
          saveDB(d); ov.close(); A.toast("success","Rekomendasi dipublikasikan","Rekomendasi sudah tampil pada bagian rekomendasi guru di portal siswa."); renderRekomendasi();
        };
      }
    });
  }

  function renderPeminjaman() {
    const dbx = db();
    const loans = dbx.loans.slice().sort((a,b)=>new Date(b.loan_date)-new Date(a.loan_date)).slice(0,30);
    render(`
      <div class="page-head"><h1>Aktivitas Peminjaman</h1><p>Ringkasan transaksi peminjaman perpustakaan.</p></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Kode</th><th>Siswa</th><th>Buku</th><th>Pinjam</th><th>Jatuh Tempo</th><th>Status</th></tr></thead>
      <tbody>${loans.map(l => {
        const st = dbx.students.find(s=>s.id===l.student_id), b=bookById(l.book_id);
        const status = l.status==="overdue" ? ["Terlambat","danger"] : l.status==="returned" ? ["Dikembalikan","neutral"] : ["Dipinjam","success"];
        return `<tr><td>${esc(l.loan_code)}</td><td>${esc(st?st.nama:"-")}</td><td><b>${esc(b?b.judul:"-")}</b></td><td>${fmtDate(l.loan_date)}</td><td>${fmtDate(l.due_date)}</td><td><span class="badge badge-${status[1]}">${status[0]}</span></td></tr>`;
      }).join("")}</tbody></table></div>`);
  }

  function renderProfil() {
    const p = profile(), u = session();
    render(`
      <div class="page-head"><h1>Profil Guru</h1><p>Informasi akun dan data mengajar.</p></div>
      <div class="grid" style="grid-template-columns:1fr 1.4fr;gap:18px;" id="profileGrid">
        <div class="card center">
          <div class="avatar" style="width:82px;height:82px;margin:0 auto 12px;font-size:28px;">${esc((p?.nama || u.name).split(" ").map(x=>x[0]).slice(0,2).join(""))}</div>
          <h2 style="font-size:20px;">${esc(p?.nama || u.name)}</h2><p class="muted">${esc(p?.mapel || "Guru")} • ${esc(p?.kelas || "Semua kelas")}</p>
          <span class="role-pill mt-12">👩‍🏫 Guru</span>
        </div>
        <div class="card">
          <h3 style="font-size:16px;margin-bottom:16px;">Data Mengajar</h3>
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:14px;">
            <div><span class="sub">NIP</span><b style="display:block;">${esc(p?.nip || "-")}</b></div>
            <div><span class="sub">Mata Pelajaran</span><b style="display:block;">${esc(p?.mapel || "-")}</b></div>
            <div><span class="sub">Kelas</span><b style="display:block;">${esc(p?.kelas || "-")}</b></div>
            <div><span class="sub">Email</span><b style="display:block;">${esc(p?.email || "-")}</b></div>
          </div>
        </div>
      </div>`);
    if (window.innerWidth <= 800) { const g=document.getElementById("profileGrid"); if(g)g.style.gridTemplateColumns="1fr"; }
  }

  function boot() {
    if (!A.requireAuth()) return;
    if (session().role !== "guru") { location.href = session().role === "admin" ? "app-admin.html" : "app-student.html"; return; }
    renderLayout(); renderDashboard();
  }
  document.addEventListener("DOMContentLoaded", boot);
})();
