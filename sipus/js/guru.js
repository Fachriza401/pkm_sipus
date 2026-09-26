/* ============================================================
   SIPUS — Aplikasi Guru (SPA)
   Fitur: Beranda, Katalog Buku, Usulan Buku (karya sendiri /
          usulan koleksi), Rekomendasi Saya (buku untuk siswa),
          Peminjaman (monitor), Riwayat, Profil Guru
   Konsisten dengan design system SIPUS (biru-putih-kuning).
   ============================================================ */
(function () {
  const S = window.SIPUS;
  const A = window.APP;
  const { getDB, saveDB, ICONS, esc, fmtDate, fmtDateLong, timeAgo, bookById, categoryName, studentById, bookStatus, uid, syncOverdue } = S;

  let state = { view: "dashboard", bookId: null, cat: "all", q: "", pmStatus: "all", page: 1, pageSize: 12 };

  function session() { return A.getSession(); }
  function db() { return getDB(); }

  function currentTeacher() {
    const s = session(); if (!s) return null;
    return db().teacher_profiles.find(t => t.user_id === s.user_id) || null;
  }

  function myProposals(teacherId) { return (db().book_requests || []).filter(p => p.teacher_id === teacherId); }
  function myRecs(teacherId) { return (db().recommendations || []).filter(r => r.teacher_id === teacherId && r.status === "published"); }

  const REQ_STATUS = {
    pending: { label: "Menunggu", type: "warning" },
    approved: { label: "Disetujui", type: "success" },
    rejected: { label: "Ditolak", type: "danger" }
  };
  function reqStatusInfo(status) { return REQ_STATUS[status] || { label: status || "Menunggu", type: "neutral" }; }

  /* ================= LAYOUT ================= */
  const NAV_ITEMS = [
    { label: "Menu", key: "dashboard", icon: "home", text: "Beranda" },
    { key: "katalog", icon: "book", text: "Katalog Buku" },
    { key: "usulan", icon: "upload", text: "Usulan Buku" },
    { key: "rekomendasi", icon: "sparkle", text: "Rekomendasi Saya" },
    { key: "peminjaman", icon: "loan", text: "Peminjaman" },
    { key: "notifikasi", icon: "bell", text: "Notifikasi" },
    { key: "riwayat", icon: "history", text: "Riwayat" },
    { key: "profil", icon: "user", text: "Profil" }
  ];

  const BOTTOM_NAV = [
    { key: "dashboard", icon: "home", text: "Beranda" },
    { key: "katalog", icon: "book", text: "Katalog" },
    { key: "usulan", icon: "upload", text: "Usulan" },
    { key: "rekomendasi", icon: "sparkle", text: "Rekomendasi" },
    { key: "profil", icon: "user", text: "Profil" }
  ];

  const TITLES = {
    dashboard: "Beranda", katalog: "Katalog Buku", detail: "Detail Buku",
    usulan: "Usulan Buku", rekomendasi: "Rekomendasi Saya", peminjaman: "Data Peminjaman Siswa",
    notifikasi: "Notifikasi", riwayat: "Riwayat Aktivitas", profil: "Profil Guru"
  };

  function guruUnread() { return A.notifBadgeFor(session()); }

  function renderLayout() {
    const s = session();
    const unread = guruUnread();
    const navItems = NAV_ITEMS.map(it => ({ ...it, badge: it.key === "notifikasi" ? unread : 0 }));
    const sidebar = A.buildSidebar(navItems, state.view === "detail" ? "katalog" : state.view, s);
    const topbar = A.buildTopbar(TITLES[state.view] || "Beranda", unread);
    const bottomNav = BOTTOM_NAV.map(b => `
      <button class="bn-item ${state.view === b.key ? "active" : ""}" data-bn="${b.key}">
        ${ICONS[b.icon]}<span>${b.text}</span>
      </button>`).join("");

    A.setAppShell(`${sidebar}<main class="main">${topbar}<div class="content" id="content"></div></main>`);
    const bn = document.getElementById("bottomNav");
    if (bn) bn.innerHTML = bottomNav;

    A.afterLayout({
      onNotif: () => go("notifikasi"),
      onNotifDropdown: (panel) => buildGuruNotifPanel(panel),
      onAvatar: () => {},
      profileMenu: [
        { key: "profil", icon: "user", text: "Profil Saya" },
        { key: "password", icon: "lock", text: "Ubah Password" },
        { key: "keluar", icon: "logout", text: "Keluar" }
      ],
      onSearch: (q) => { state.q = q; go("katalog"); }
    });
    A.startNotifSync();

    const nav = document.getElementById("bottomNav");
    if (nav) nav.querySelectorAll("[data-bn]").forEach(b => b.onclick = () => go(b.dataset.bn));
  }

  function render(html) {
    const c = document.getElementById("content");
    c.innerHTML = html;
    document.querySelectorAll("[data-open]").forEach(el => el.onclick = (e) => { e.stopPropagation(); openBook(el.dataset.open); });
    document.querySelectorAll("[data-detail]").forEach(el => el.onclick = (e) => { e.stopPropagation(); openBook(el.dataset.detail); });
    document.querySelectorAll("[data-rec]").forEach(el => el.onclick = (e) => { e.stopPropagation(); recForm(el.dataset.rec); });
  }

  window.__NAV__ = {
    dashboard: () => { state.view = "dashboard"; state.bookId = null; renderLayout(); renderDashboard(); scrollTop(); },
    katalog: () => { state.view = "katalog"; state.bookId = null; renderLayout(); renderKatalog(); scrollTop(); },
    detail: () => { state.view = "detail"; renderLayout(); renderDetail(); scrollTop(); },
    usulan: () => { state.view = "usulan"; state.bookId = null; renderLayout(); renderUsulan(); scrollTop(); },
    rekomendasi: () => { state.view = "rekomendasi"; state.bookId = null; renderLayout(); renderRekomendasi(); scrollTop(); },
    peminjaman: () => { state.view = "peminjaman"; state.bookId = null; renderLayout(); renderPeminjaman(); scrollTop(); },
    riwayat: () => { state.view = "riwayat"; state.bookId = null; renderLayout(); renderRiwayat(); scrollTop(); },
    notifikasi: () => { state.view = "notifikasi"; state.bookId = null; renderLayout(); renderNotifikasi(); scrollTop(); },
    profil: () => { state.view = "profil"; state.bookId = null; renderLayout(); renderProfil(); scrollTop(); },
    password: () => { state.view = "profil"; state.bookId = null; renderLayout(); renderProfil(true); scrollTop(); },
    keluar: () => logout()
  };

  function go(key) { if (window.__NAV__[key]) window.__NAV__[key](); }
  function openBook(id) { state.bookId = id; state.view = "detail"; renderLayout(); renderDetail(); scrollTop(); }
  function scrollTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }

  function logout() {
    let name = "";
    try { const cu = A.currentUser(); if (cu && cu.name) name = cu.name; } catch (e) {}
    A.logoutDialog({
      name: name || "Guru",
      sub: "Sesi Portal Guru akan diakhiri dengan aman. Sampai jumpa di perpustakaan!",
      onConfirm: () => { A.clearSession(); location.href = "login.html"; }
    });
  }

  /* ================= BERANDA ================= */
  function renderDashboard() {
    const dbx = db();
    const gru = currentTeacher();
    const s = session();
    const nama = gru ? gru.nama : s.name;
    const proposals = gru ? myProposals(gru.id) : [];
    const recs = gru ? myRecs(gru.id) : [];
    const pendingP = proposals.filter(p => p.status === "pending").length;
    const borrowedTotal = dbx.books.reduce((acc, b) => acc + (b.borrowed || 0), 0);
    const activeStudents = dbx.users.filter(u => u.role === "siswa" && u.status === "Aktif").length;
    const firstName = (nama || "Guru").split(",")[0].trim().split(" ")[0];
    const settings = dbx.settings || {};
    const announcements = (settings.announcements || []).slice().reverse();
    const loans = dbx.loans.filter(l => ["active", "overdue"].includes(l.status)).sort((a, b) => new Date(b.loan_date) - new Date(a.loan_date)).slice(0, 6);
    const recBooks = dbx.books.slice().sort((a, b) => b.tahun - a.tahun).slice(0, 4);
    const activity = buildGuruActivity(proposals, recs);

    const token = (renderDashboard.__t = (renderDashboard.__t || 0) + 1);
    render(skeletonGuru());
    setTimeout(() => {
      if (renderDashboard.__t !== token) return;
      render(realHtml());
    }, 280);

    function realHtml() {
      return `
      <div class="hero">
        <div>
          <span class="hero-kicker">${ICONS.book} Portal Guru</span>
          <h2>Kelola Perpustakaan untuk Generasi yang Lebih Cerdas</h2>
          <p>Halo, ${esc(firstName)} — bantu siswa menemukan bacaan bermanfaat lewat usulan dan rekomendasi bukumu.</p>
          <div class="hero-cta no-print">
            <button class="btn btn-glass" onclick="window.__NAV__.katalog();">${ICONS.book} Lihat Katalog</button>
            <button class="btn btn-usulan" onclick="window.__NAV__.usulan();">${ICONS.upload} Ajukan Usulan</button>
          </div>
        </div>
        <img class="hero-art" src="assets/hero-guru.svg" alt="Ilustrasi perpustakaan">
      </div>

      <div class="dash-stats">
        ${gstat("blue", ICONS.loan, borrowedTotal, "Buku Dipinjam", "Koleksi sedang dipinjam")}
        ${gstat("orange", ICONS.upload, proposals.length, "Usulan Buku", pendingP ? `${pendingP} menunggu` : "Tidak ada antrean")}
        ${gstat("yellow", ICONS.sparkle, recs.length, "Rekomendasi Saya", "Untuk siswa")}
        ${gstat("green", ICONS.users, activeStudents, "Aktivitas Siswa", "Siswa aktif")}
      </div>

      <div class="guru-dash">
        <div class="guru-main">
          <div class="dash-section" style="margin-bottom:22px;">
            <div class="section-head"><h3>Aktivitas Peminjaman Siswa</h3><a class="link-arrow" onclick="window.__NAV__.peminjaman();">Lihat semua →</a></div>
            ${loans.length ? `
            <div class="mini-table-wrap">
              <table class="mini-table">
                <thead><tr><th>No</th><th>Nama</th><th>Kelas</th><th>Judul</th><th>Tanggal Pinjam</th><th>Jatuh Tempo</th><th>Status</th></tr></thead>
                <tbody>
                  ${loans.map((l, i) => {
                    const st = studentById(l.student_id);
                    const b = bookById(l.book_id);
                    const stt = loanStatusBadge(l);
                    return `
                  <tr>
                    <td>${i + 1}</td>
                    <td><b>${st ? esc(st.nama) : "-"}</b></td>
                    <td>${st ? esc(st.kelas || "-") : "-"}</td>
                    <td>${b ? esc(b.judul) : "-"}</td>
                    <td>${fmtDate(l.loan_date)}</td>
                    <td>${fmtDate(l.due_date)}</td>
                    <td><span class="badge badge-${stt.type}">${esc(stt.label)}</span></td>
                  </tr>`; }).join("")}
                </tbody>
              </table>
            </div>` : A.emptyState("📚", "Belum ada peminjaman", "Aktivitas pinjaman siswa akan tampil di sini.", `<button class="btn btn-sm" onclick="window.__NAV__.peminjaman();">${ICONS.loan} Data Peminjaman</button>`)}
          </div>

          <div class="dash-grid-2" style="margin-bottom:0;">
            <div class="dash-section">
              <div class="section-head"><h3>Buku yang Sedang Saya Pinjam</h3></div>
              ${A.emptyState("📗", "Tidak ada pinjaman pribadi", "SIPUS dipakai siswa untuk meminjam buku. Pantau peminjaman lewat tabel di atas.")}
            </div>
            <div class="dash-section">
              <div class="section-head"><h3>Usulan Buku Saya</h3><a class="link-arrow" onclick="window.__NAV__.usulan();">Kelola →</a></div>
              ${proposals.slice(0, 4).map(p => {
                const info = reqStatusInfo(p.status);
                return `<div class="loan-item">
                  <div class="info" style="flex:1;"><b>${esc(p.title)}</b>${p.penulis ? `<span>${esc(p.penulis)}</span>` : ""}</div>
                  <span class="badge badge-${info.type}">${esc(info.label)}</span>
                </div>`;
              }).join("") || A.emptyState("📤", "Belum ada usulan", "Ajukan usulan buku untuk memperkaya koleksi perpustakaan.", `<button class="btn btn-sm" onclick="window.__NAV__.usulan();">${ICONS.upload} Ajukan Usulan</button>`)}
            </div>
          </div>

          <div class="dash-section" style="margin-top:22px;">
            <div class="section-head"><h3>Rekomendasi Buku untuk Siswa</h3><a class="link-arrow" onclick="window.__NAV__.rekomendasi();">Kelola rekomendasi →</a></div>
            ${recBooks.length ? `<div class="rec-list">
              ${recBooks.map(b => {
                const done = recs.some(r => r.book_id === b.id);
                return `<div class="rec-row">
                  ${b.cover ? `<img class="mini-cover" src="${esc(b.cover)}" alt="">` : `<div class="mini-cover no-cover-md">${esc(b.kode)}</div>`}
                  <div class="info"><b>${esc(b.judul)}</b><span>${esc(b.penulis)} • ${esc(b.tahun)}</span></div>
                  ${done ? `<span class="btn-rec done">✓ Sudah Direkomendasikan</span>` : `<button class="btn btn-outline btn-sm" data-rec="${b.id}">${ICONS.sparkle} Rekomendasikan</button>`}
                </div>`;
              }).join("")}
            </div>` : A.emptyState("📖", "Belum ada buku", "Koleksi perpustakaan akan tampil di sini.")}
          </div>

          <div class="dash-section" style="margin-top:22px;margin-bottom:0;">
            <div class="section-head"><h3>Aktivitas Terakhir</h3></div>
            ${activity.length ? `<ul class="timeline">${activity.map(a => `
              <li class="timeline-item ${a.type}">
                <span class="timeline-dot">${a.icon}</span>
                <div class="timeline-body"><b>${esc(a.title)}</b><div class="time">${esc(a.time)}</div></div>
              </li>`).join("")}</ul>` : A.emptyState("📌", "Belum ada aktivitas", "Usulan dan rekomendasi yang kamu buat akan tercatat di sini.")}
          </div>
        </div>

        <aside class="dash-rail">
          <div class="dash-section">
            <div class="section-head"><h3>Menu Cepat</h3></div>
            <div class="quick-menu two">
              <button class="quick-menu-item" onclick="window.__NAV__.katalog();">${ICONS.book}<span>Katalog Buku</span></button>
              <button class="quick-menu-item" onclick="window.__NAV__.usulan();">${ICONS.upload}<span>Usulan Buku</span></button>
              <button class="quick-menu-item" onclick="window.__NAV__.rekomendasi();">${ICONS.sparkle}<span>Rekomendasi</span></button>
              <button class="quick-menu-item" onclick="window.__NAV__.peminjaman();">${ICONS.loan}<span>Peminjaman</span></button>
            </div>
          </div>
          ${announcements.length ? `
          <div class="dash-section">
            <div class="section-head"><h3>Pengumuman</h3></div>
            ${announcements.map(a => `<div class="announce-banner" style="margin-bottom:10px;">
              <span style="font-size:18px;">📢</span>
              <div><b>${esc(a.title)}</b><p>${esc(a.message)}</p><div class="time muted text-xs" style="margin-top:4px;">${timeAgo(a.created_at)}</div></div>
            </div>`).join("")}
          </div>` : ""}
          <div class="dash-section" style="margin-bottom:0;">
            <div class="section-head"><h3>Info Perpustakaan</h3></div>
            <div class="loan-modal-row"><b>Jam layanan</b><span>${esc(settings.library_hours || "-")}</span></div>
            <div class="loan-modal-row"><b>Masa pinjam</b><span>${esc(settings.loan_duration || 7)} hari</span></div>
            <div class="loan-modal-row"><b>Kontak</b><span>${esc(settings.contact || "-")}</span></div>
          </div>
        </aside>
      </div>`;
    }
  }

  function gstat(color, icon, num, lbl, trend) {
    return `<div class="stat-card">
      <div class="flex items-center gap-14">
        <div class="stat-icon ${color}">${icon}</div>
        <div class="stat-info">
          <div class="num">${num}</div>
          <div class="lbl">${esc(lbl)}</div>
          <div class="trend">${esc(trend)}</div>
        </div>
      </div>
    </div>`;
  }

  function loanStatusBadge(l) {
    const diff = Math.ceil((new Date(l.due_date) - new Date()) / 86400000);
    if (l.status === "overdue" || diff < 0) return { label: "Terlambat", type: "danger" };
    if (l.status === "active" && diff <= 2) return { label: "Segera", type: "warning" };
    if (l.status === "active") return { label: "Tepat Waktu", type: "success" };
    return { label: "Selesai", type: "neutral" };
  }

  function buildGuruActivity(proposals, recs) {
    const acts = [];
    proposals.slice(0, 5).forEach(p => acts.push({ date: p.created_at, type: p.status === "pending" ? "warning" : p.status === "approved" ? "success" : p.status === "rejected" ? "danger" : "info", icon: "📤", title: `Mengajukan usulan buku "${p.title}"`, time: timeAgo(p.created_at) }));
    recs.slice(0, 5).forEach(r => { const b = bookById(r.book_id); acts.push({ date: r.created_at, type: "success", icon: "✨", title: `Rekomendasi "${b ? b.judul : "-"}" untuk siswa`, time: timeAgo(r.created_at) }); });
    return acts.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  }

  function skeletonGuru() {
    return `
      <div class="skel-hero"><div style="padding:30px;"><div class="skel skel-line w60"></div><div class="skel skel-line w80"></div><div class="skel skel-line w40"></div></div></div>
      <div class="dash-stats">
        ${[0, 1, 2, 3].map(() => `<div class="skel-card"><div class="skel skel-line w40"></div><div class="skel skel-line w80"></div></div>`).join("")}
      </div>
      <div class="guru-dash">
        <div class="skel-card" style="grid-column:1 / -1;"><div class="skel skel-line w60"></div><div class="skel skel-line"></div><div class="skel skel-line w80"></div></div>
        <div class="skel-card"><div class="skel skel-line w60"></div><div class="skel skel-line"></div></div>
        <div class="skel-card"><div class="skel skel-line w60"></div><div class="skel skel-line"></div></div>
      </div>`;
  }

  /* ================= NOTIF DROPDOWN GURU ================= */
  function buildGuruNotifPanel(panel) {
    const gru = currentTeacher();
    const dbx = db();
    const items = [];
    (dbx.notifications || []).filter(n => n.teacher_id === gru.id).forEach(n => {
      const ai = { due: "⏰", late: "🚨", system: "💬", news: "📢", info: "💡" };
      items.push({ icon: ai[n.type] || ai.info, cls: n.is_read ? "" : "unread", title: n.title, msg: n.message, time: timeAgo(n.created_at), date: n.created_at, ntid: n.id });
    });
    myProposals(gru.id).forEach(p => {
      const st = p.status === "pending" ? { icon: "🕓", cls: "warning" } : p.status === "approved" ? { icon: "✅", cls: "success" } : { icon: "⛔", cls: "danger" };
      items.push({ icon: st.icon, cls: st.cls, title: `Usulan "${p.title}"`, msg: `${reqStatusInfo(p.status).label.toLowerCase()} oleh admin`, time: timeAgo(p.created_at), date: p.created_at });
    });
    myRecs(gru.id).forEach(r => {
      const b = bookById(r.book_id);
      items.push({ icon: "✨", cls: "success", title: "Rekomendasi diterbitkan", msg: b ? `"${b.judul}" tampil untuk siswa` : "-", time: timeAgo(r.created_at), date: r.created_at });
    });
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!items.length) items.push({ icon: "💡", cls: "", title: "Tidak ada notifikasi", msg: "Usulan, rekomendasi, dan kabar dari admin akan muncul di sini.", time: "" });

    const html = `
      <div class="np-head"><b>Notifikasi Guru</b><button id="grNotifMarkAll">Tandai semua dibaca</button></div>
      <div class="np-list">
        ${items.slice(0, 6).map(n => `
          <div class="np-item ${n.cls}" ${n.ntid ? `data-ntid="${n.ntid}"` : ""}>
            <span class="np-icon">${n.icon}</span>
            <div class="np-body"><b>${esc(n.title)}</b><p>${esc(n.msg)}</p>${n.time ? `<div class="time">${esc(n.time)}</div>` : ""}</div>
          </div>`).join("")}
      </div>
      <div class="np-foot"><a style="cursor:pointer;" onclick="window.__NAV__.notifikasi(); document.getElementById('topNotifPanel') && (document.getElementById('topNotifPanel').hidden = true);">Lihat semua notifikasi →</a></div>`;

    panel.innerHTML = html;
    panel.querySelectorAll("[data-ntid]").forEach(el => el.onclick = () => {
      const d2 = db();
      const n = d2.notifications.find(x => x.id === el.dataset.ntid);
      if (n && !n.is_read) { n.is_read = true; saveDB(d2); A.refreshNotifBadges(); buildGuruNotifPanel(panel); }
    });
    const ma = panel.querySelector("#grNotifMarkAll");
    if (ma) ma.onclick = () => {
      const d2 = db();
      d2.notifications.forEach(n => { if (n.teacher_id === gru.id) n.is_read = true; });
      saveDB(d2); A.refreshNotifBadges(); buildGuruNotifPanel(panel);
      A.toast("success", "Semua notifikasi dibaca");
    };
  }

  /* ================= HALAMAN NOTIFIKASI GURU ================= */
  function renderNotifikasi() {
    const dbx = db();
    const gru = currentTeacher();
    const items = [];
    (dbx.notifications || []).filter(n => n.teacher_id === gru.id).forEach(n => {
      const ai = { due: "⏰", late: "🚨", system: "💬", news: "📢", info: "💡" };
      items.push({
        icon: ai[n.type] || ai.info, cls: n.is_read ? "" : "unread", title: n.title, msg: n.message, time: n.created_at, id: n.id, read: n.is_read
      });
    });
    myProposals(gru.id).forEach(p => {
      const st = p.status === "pending" ? { icon: "🕓", cls: "warning" } : p.status === "approved" ? { icon: "✅", cls: "success" } : { icon: "⛔", cls: "danger" };
      items.push({ icon: st.icon, cls: st.cls, title: `Usulan "${p.title}"`, msg: `${reqStatusInfo(p.status).label} oleh admin`, time: p.created_at, id: null, read: true });
    });
    myRecs(gru.id).forEach(r => {
      const b = bookById(r.book_id);
      items.push({ icon: "✨", cls: "success", title: "Rekomendasi diterbitkan", msg: b ? `"${b.judul}" tampil untuk siswa` : "-", time: r.created_at, id: null, read: true });
    });
    items.sort((a, b) => new Date(b.time) - new Date(a.time));

    const html = `
      <div class="page-head flex justify-between items-center flex-wrap gap-8">
        <div><h1>Notifikasi</h1><p>Kabar terbaru dari admin dan status usulan bukumu.</p></div>
        <button class="btn" id="notifMarkAll">${ICONS.check} Tandai Semua Dibaca</button>
      </div>
      <div class="section">
        <div class="section-head"><h3>Semua Notifikasi</h3><span class="badge badge-accent">${items.length} total</span></div>
        ${items.length ? items.map(n => `
          <div class="notif-item ${n.cls || ""}" ${n.id ? `data-ntid="${n.id}"` : ""}>
            <div class="notif-icon">${n.icon}</div>
            <div class="notif-body">
              <b>${esc(n.title)}</b><p>${esc(n.msg)}</p>
              <div class="time">${timeAgo(n.time)}</div>
            </div>
            ${n.id && !n.read ? '<span class="badge badge-accent">Baru</span>' : ""}
          </div>`).join("") : A.emptyState("🔔", "Belum ada notifikasi", "Kabar dari admin akan muncul di sini.")}
      </div>`;

    render(html);
    const b = document.getElementById("notifMarkAll");
    if (b) b.onclick = () => {
      const d2 = db();
      if (gru) {
        d2.notifications.forEach(n => { if (n.teacher_id === gru.id) n.is_read = true; });
      }
      saveDB(d2); renderNotifikasi(); A.refreshNotifBadges();
      A.toast("success", "Semua notifikasi dibaca");
    };
    document.querySelectorAll("[data-ntid]").forEach(el => el.onclick = () => {
      const d2 = db();
      const n = d2.notifications.find(x => x.id === el.dataset.ntid);
      if (n && !n.is_read) { n.is_read = true; saveDB(d2); A.refreshNotifBadges(); renderNotifikasi(); }
    });
  }

  function guruBookCard(b) {
    return `
      <div class="book-card">
        <div class="book-cover" data-open="${b.id}" style="cursor:pointer;">
          ${b.cover ? `<img src="${esc(b.cover)}" alt="${esc(b.judul)}">` : `<div class="no-cover"><b style="font-size:13px;">${esc(b.kode)}</b><div style="font-size:10.5px;opacity:.75;margin-top:5px;text-transform:uppercase;">${esc(categoryName(b.kategori_id))}</div></div>`}
        </div>
        <div class="book-body" style="cursor:pointer;" data-open="${b.id}">
          <div class="book-cat">${esc(categoryName(b.kategori_id))}</div>
          <div class="book-title">${esc(b.judul)}</div>
          <div class="book-author">${esc(b.penulis)} • ${esc(b.tahun)}</div>
          <div class="book-foot">${A.badgeHtml(b)}</div>
          <div class="book-actions">
            <button class="btn btn-ghost btn-sm" data-detail="${b.id}">Detail</button>
            <button class="btn btn-sm" data-rec="${b.id}">${ICONS.sparkle} Rekomendasikan</button>
          </div>
        </div>
      </div>`;
  }

  /* ================= KATALOG (read-only untuk guru) ================= */
  function renderKatalog() {
    const dbx = db();
    const cats = dbx.categories;
    let list = dbx.books.slice();

    if (state.q) {
      const q = state.q.toLowerCase();
      list = list.filter(b => b.judul.toLowerCase().includes(q) || b.penulis.toLowerCase().includes(q) || categoryName(b.kategori_id).toLowerCase().includes(q));
    }
    if (state.cat !== "all") list = list.filter(b => b.kategori_id === state.cat);
    list.sort((a, b) => b.tahun - a.tahun);

    const totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
    const p = Math.min(state.page, totalPages);
    const pageItems = list.slice((p - 1) * state.pageSize, p * state.pageSize);

    const catChips = `<button class="filter-chip ${state.cat === "all" ? "active" : ""}" data-cat="all">Semua</button>
      ${cats.map(c => `<button class="filter-chip ${state.cat === c.id ? "active" : ""}" data-cat="${c.id}">${esc(c.name)}</button>`).join("")}`;

    const html = `
      <div class="page-head" style="margin-bottom:18px;">
        <h1>Katalog Buku</h1>
        <p>Telusuri koleksi perpustakaan sekolah — ${list.length} judul tersedia untuk direkomendasikan kepada siswa.</p>
      </div>
      <div class="search-bar mb-16">
        ${ICONS.search}<input type="text" id="catSearch" placeholder="Cari judul, penulis, atau kategori..." value="${esc(state.q)}">
      </div>
      <div class="filters" id="catChips">${catChips}</div>
      ${list.length ? `<div class="book-grid" id="bookGrid">${pageItems.map(b => guruBookCard(b)).join("")}</div>
        <div class="pagination" id="pag"></div>` : A.emptyState("assets/student-reading.svg", "Buku tidak ditemukan", "Coba kata kunci lain atau ubah filter pencarian.")}`;

    render(html);
    const ci = document.getElementById("catSearch");
    if (ci) {
      ci.oninput = (e) => { state.q = ci.value.trim(); state.page = 1; debounce(renderKatalog, 300); };
      ci.onkeydown = (e) => { if (e.key === "Enter") { state.q = ci.value.trim(); state.page = 1; renderKatalog(); } };
    }
    document.querySelectorAll("#catChips [data-cat]").forEach(ch => ch.onclick = () => { state.cat = ch.dataset.cat; state.page = 1; renderKatalog(); });
    A.renderPagination(document.getElementById("pag"), p, totalPages, np => { state.page = np; renderKatalog(); });
  }

  let debounceT = null;
  function debounce(fn, ms) { clearTimeout(debounceT); debounceT = setTimeout(fn, ms); }

  /* ================= DETAIL BUKU ================= */
  function renderDetail() {
    const b = bookById(state.bookId);
    if (!b) { renderKatalog(); return; }
    const cat = categoryName(b.kategori_id);

    const html = `
      <div class="page-head"><a style="cursor:pointer;" onclick="window.__NAV__.katalog();">← Kembali ke katalog</a></div>
      <div class="detail-layout">
        <div>
          <div class="detail-cover">
            ${b.cover ? `<img src="${esc(b.cover)}" alt="${esc(b.judul)}">` : `<div class="no-cover"><b style="font-size:18px;">${esc(b.kode)}</b></div>`}
          </div>
          <button class="btn btn-block mt-12" id="recBtn">${ICONS.sparkle} Rekomendasikan ke Siswa</button>
        </div>
        <div>
          <div class="flex items-center gap-8" style="margin-bottom:8px;">
            ${A.badgeHtml(b)}<span class="badge badge-primary">${esc(cat)}</span><span class="badge badge-neutral">Rak ${esc(b.rak)}</span>
          </div>
          <h1 class="detail-title">${esc(b.judul)}</h1>
          <div class="detail-sub">${esc(b.penulis)} • ${esc(b.penerbit)} • ${esc(b.tahun)}</div>
          <div class="stock-box">
            <div class="stat-icon blue" style="width:54px;height:54px;">${ICONS.box}</div>
            <div class="stock-num"><b>${b.available}</b><span>Stok tersedia</span></div>
            <div style="width:1px;height:36px;background:var(--border);"></div>
            <div class="stock-num"><b>${b.total}</b><span>Total eksemplar</span></div>
          </div>
          <div class="detail-sinopsis mt-24"><h4><b>Sinopsis</b></h4><p>${esc(b.sinopsis)}</p></div>
          <div class="detail-meta">
            <div class="meta-row"><b>ISBN</b><span>${esc(b.isbn || "-")}</span></div>
            <div class="meta-row"><b>Penerbit</b><span>${esc(b.penerbit)}</span></div>
            <div class="meta-row"><b>Tahun</b><span>${esc(b.tahun)}</span></div>
            <div class="meta-row"><b>Kategori</b><span>${esc(cat)}</span></div>
          </div>
        </div>
      </div>`;
    render(html);
    document.getElementById("recBtn").onclick = () => recForm(b.id);
  }

  /* ================= USULAN BUKU ================= */
  function renderUsulan() {
    const gru = currentTeacher();
    const list = myProposals(gru.id).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const html = `
      <div class="page-head flex justify-between items-center flex-wrap gap-8">
        <div><h1>Usulan Buku</h1><p>Ajukan karya sendiri atau usulan koleksi baru untuk ditambahkan ke perpustakaan.</p></div>
        <button class="btn btn-accent" id="addUsulan">${ICONS.plus} Usulkan Buku Baru</button>
      </div>
      ${list.length ? `
      <div class="search-bar mb-16" style="max-width:460px;">${ICONS.search}<input type="text" id="uslSearch" placeholder="Cari judul, penulis, atau kategori usulan..."></div>
      <div class="table-wrap">
        <table class="table table-cards">
          <thead><tr><th>No</th><th>Judul Buku</th><th>Penulis</th><th>Kategori</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody id="uslTbody">
            ${list.map((p, i) => {
              const st = reqStatusInfo(p.status);
              const isOwn = p.type === "karya_sendiri";
              return `<tr data-search="${esc((p.title + " " + (p.author || "") + " " + categoryName(p.category_id) + " " + st.label).toLowerCase())}">
                <td data-label="No">${i + 1}</td>
                <td data-label="Judul Buku"><div class="td-title">${esc(p.title)}</div>${isOwn ? `<div class="sub">✍️ Karya sendiri</div>` : ""}${p.review_note ? `<div class="sub">Catatan: ${esc(p.review_note)}</div>` : ""}</td>
                <td data-label="Penulis">${esc(p.author || "-")}</td>
                <td data-label="Kategori">${esc(categoryName(p.category_id))}</td>
                <td data-label="Tanggal">${fmtDate(p.created_at)}</td>
                <td data-label="Status"><span class="badge badge-${st.type}">${esc(st.label)}</span></td>
                <td data-label="Aksi">
                  <div class="td-actions">
                    <button class="action-btn" title="Detail" data-usl-view="${p.id}">${ICONS.eye}</button>
                    ${p.status === "pending" ? `<button class="action-btn" title="Ubah" data-usl-edit="${p.id}">${ICONS.edit}</button>
                    <button class="action-btn red" title="Hapus" data-usl-del="${p.id}">${ICONS.trash}</button>` : ""}
                  </div>
                </td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>` : A.emptyState("assets/student-reading.svg", "Belum ada usulan buku", "Ajukan karya sendiri atau usulan koleksi baru untuk perpustakaan sekolah.", `<button class="btn btn-sm" id="emptyAddUsulan">${ICONS.plus} Usulkan Buku Baru</button>`)}`;

    render(html);
    const add = document.getElementById("addUsulan") || document.getElementById("emptyAddUsulan");
    if (add) add.onclick = () => usulanForm();
    const us = document.getElementById("uslSearch");
    if (us) us.oninput = () => {
      const q = us.value.toLowerCase();
      document.querySelectorAll("#uslTbody tr[data-search]").forEach(tr => { tr.style.display = tr.dataset.search.includes(q) ? "" : "none"; });
    };
    document.querySelectorAll("[data-usl-view]").forEach(b => b.onclick = () => usulanDetail(b.dataset.uslView));
    document.querySelectorAll("[data-usl-edit]").forEach(b => b.onclick = () => usulanForm(b.dataset.uslEdit));
    document.querySelectorAll("[data-usl-del]").forEach(b => b.onclick = () => {
      const p = db().book_requests.find(x => x.id === b.dataset.uslDel);
      A.confirmDialog("Hapus Usulan", `Hapus usulan <b>"${esc(p ? p.title : "")}"</b>?`, () => {
        const d2 = db();
        d2.book_requests = d2.book_requests.filter(x => x.id !== p.id);
        saveDB(d2); A.toast("success", "Usulan dihapus"); renderUsulan();
      }, { danger: true });
    });
  }

  function usulanForm(id) {
    const dbx = db();
    const gru = currentTeacher();
    const p = id ? dbx.book_requests.find(x => x.id === id) : null;
    const cats = dbx.categories;

    A.openModal(p ? "Ubah Usulan Buku" : "Form Usulan Buku Baru", `
      <form id="uslForm" class="mt-8">
        <div class="login-type-switch" id="uslType">
          <button type="button" class="active" data-v="rekomendasi">Rekomendasi Koleksi</button>
          <button type="button" data-v="karya_sendiri">Karya Sendiri</button>
        </div>
        <div class="field"><label>Judul Buku *</label><input class="input" id="uJudul" value="${esc(p ? p.title : "")}" placeholder="Masukkan judul buku" required></div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label>Penulis *</label><input class="input" id="uPenulis" value="${esc(p ? p.author : (gru ? gru.nama : ""))}" required></div>
          <div class="field"><label>Penerbit</label><input class="input" id="uPenerbit" value="${esc(p ? p.publisher : "")}" placeholder="Masukkan penerbit"></div>
        </div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label>Tahun Terbit</label><select class="select" id="uTahun">${Array.from({length: 15}, (_, i) => new Date().getFullYear() - i).map(y => `<option ${p && p.year === y ? "selected" : ""}>${y}</option>`).join("")}</select></div>
          <div class="field"><label>Kategori *</label><select class="select" id="uKategori">${cats.map(c => `<option value="${c.id}" ${p && p.category_id === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
        </div>
        <div class="field"><label>Target Kelas</label><div class="checkbox-row">${["X", "XI", "XII"].map(k => `<label class="checkbox-pill"><input type="checkbox" value="${k}" class="uKelas"> ${k}</label>`).join("")}</div></div>
        <div class="field"><label>Deskripsi Singkat *</label><textarea class="textarea" id="uDeskripsi" placeholder="Ceritakan sedikit tentang buku ini...">${esc(p ? p.reason : "")}</textarea></div>
        <div class="flex justify-end gap-12 mt-8">
          <button class="btn btn-outline btn-sm" type="button" id="uClose">Batal</button>
          <button class="btn btn-sm" type="submit">${p ? "Simpan Perubahan" : "Kirim Usulan"}</button>
        </div>
      </form>`, {
      onOpen: (ov) => {
        let uslType = "rekomendasi";
        ov.querySelectorAll("#uslType button").forEach(btn => btn.onclick = () => {
          uslType = btn.dataset.v;
          ov.querySelectorAll("#uslType button").forEach(x => x.classList.toggle("active", x === btn));
          if (uslType === "karya_sendiri") ov.querySelector("#uPenulis").value = gru ? gru.nama : "";
        });
        if (p) {
          uslType = p.type || "rekomendasi";
          ov.querySelectorAll("#uslType button").forEach(x => x.classList.toggle("active", x.dataset.v === uslType));
        }
        ov.querySelector("#uClose").onclick = ov.close;
        ov.querySelector("#uslForm").onsubmit = (e) => {
          e.preventDefault();
          const judul = ov.querySelector("#uJudul").value.trim();
          const penulis = ov.querySelector("#uPenulis").value.trim();
          const deskripsi = ov.querySelector("#uDeskripsi").value.trim();
          if (!judul || !penulis || !deskripsi) { A.toast("warning", "Lengkapi data", "Judul, penulis, dan deskripsi wajib diisi."); return; }
          const d2 = db();
          const targetClass = Array.from(ov.querySelectorAll(".uKelas:checked")).map(c => c.value).join(" - ");
          const data = {
            type: uslType, title: judul, author: penulis,
            publisher: ov.querySelector("#uPenerbit").value.trim(),
            year: parseInt(ov.querySelector("#uTahun").value) || new Date().getFullYear(),
            category_id: ov.querySelector("#uKategori").value,
            target_class: targetClass || "X - XII",
            reason: deskripsi
          };
          if (p) {
            const idx = d2.book_requests.findIndex(x => x.id === p.id);
            d2.book_requests[idx] = { ...d2.book_requests[idx], ...data };
            A.toast("success", "Usulan diperbarui");
          } else {
            d2.book_requests.unshift({
              id: uid("usl-"), teacher_id: gru.id, ...data,
              cover: "", isbn: "", status: "pending", created_at: new Date().toISOString(), reviewed_at: null, review_note: ""
            });
            A.toast("success", "Usulan terkirim", "Menunggu persetujuan admin perpustakaan.");
          }
          saveDB(d2); ov.close(); renderUsulan();
        };
      }
    });
  }

  function usulanDetail(id) {
    const p = db().book_requests.find(x => x.id === id);
    if (!p) return;
    const st = reqStatusInfo(p.status);
    A.openModal("Detail Usulan Buku", `
      <div class="detail-usulan">
        <img src="${esc(p.cover || "assets/books/book-fallback.svg")}" alt="${esc(p.title)}">
        <div>
          <b style="font-size:16px;">${esc(p.title)}</b>
          <div class="muted text-sm">${esc(p.author || "-")} • ${esc(categoryName(p.category_id))}</div>
          ${p.type === "karya_sendiri" ? `<div class="role-pill" style="margin-top:8px;">✍️ Karya Sendiri</div>` : ""}
          <span class="badge badge-${st.type}" style="margin-top:8px;display:inline-block;">${esc(st.label)}</span>
        </div>
      </div>
      <p class="muted text-sm mt-16">${esc(p.reason || "-")}</p>
      <div class="meta-row"><b>Diajukan</b><span>${fmtDateLong(p.created_at)}</span></div>
      ${p.target_class ? `<div class="meta-row"><b>Target Kelas</b><span>${esc(p.target_class)}</span></div>` : ""}
      ${p.reviewed_at ? `<div class="meta-row"><b>Ditinjau</b><span>${fmtDateLong(p.reviewed_at)}</span></div>` : ""}
      ${p.review_note ? `<div class="meta-row"><b>Catatan Admin</b><span>${esc(p.review_note)}</span></div>` : ""}
    `);
  }

  /* ================= REKOMENDASI SAYA ================= */
  function renderRekomendasi() {
    const gru = currentTeacher();
    const list = myRecs(gru.id).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const html = `
      <div class="page-head flex justify-between items-center flex-wrap gap-8">
        <div><h1>Rekomendasi Buku yang Anda Buat</h1><p>Daftar buku yang kamu rekomendasikan untuk dibaca siswa.</p></div>
        <button class="btn" id="addRec">${ICONS.plus} Buat Rekomendasi</button>
      </div>
      <div class="search-bar mb-16" style="max-width:460px;">${ICONS.search}<input type="text" id="recSearch" placeholder="Cari nama judul, pengarang, atau kategori..."></div>
      ${list.length ? `
      <div class="table-wrap">
        <table class="table table-cards">
          <thead><tr><th>No</th><th>Judul Buku</th><th>Kategori</th><th>Target Kelas</th><th>Tanggal</th><th>Aksi</th></tr></thead>
          <tbody id="recTbody">
            ${list.map((r, i) => {
              const b = bookById(r.book_id);
              if (!b) return "";
              return `<tr data-search="${esc((b.judul + " " + b.penulis + " " + categoryName(b.kategori_id)).toLowerCase())}">
                <td data-label="No">${i + 1}</td>
                <td data-label="Judul Buku"><div class="td-title">${esc(b.judul)}</div><div class="sub">${esc(b.penulis)}</div></td>
                <td data-label="Kategori">${esc(categoryName(b.kategori_id))}</td>
                <td data-label="Target Kelas">${targetBadges(r.target_class)}</td>
                <td data-label="Tanggal">${fmtDate(r.created_at)}</td>
                <td data-label="Aksi"><div class="cell-actions"><button class="btn btn-ghost btn-sm" data-rv="${r.id}">Lihat</button> <button class="action-btn red" title="Hapus" data-rd="${r.id}">${ICONS.trash}</button></div></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
      <div class="announce-banner mt-12"><span style="font-size:18px;">📌</span><div><b>Info</b><p>Rekomendasi yang berlabel <b>Direkomendasikan Guru</b> akan muncul di halaman siswa sebagai referensi bacaan terpercaya.</p></div></div>
      ` : A.emptyState("assets/student-female.svg", "Belum ada rekomendasi", "Buat rekomendasi buku yang cocok dibaca siswa dari katalog perpustakaan.", `<button class="btn btn-sm" id="emptyAddRec">${ICONS.plus} Buat Rekomendasi</button>`)}`;

    render(html);
    const add = document.getElementById("addRec") || document.getElementById("emptyAddRec");
    if (add) add.onclick = () => recForm();
    const rs = document.getElementById("recSearch");
    if (rs) rs.oninput = () => {
      const q = rs.value.toLowerCase();
      document.querySelectorAll("#recTbody tr[data-search]").forEach(tr => { tr.style.display = tr.dataset.search.includes(q) ? "" : "none"; });
    };
    document.querySelectorAll("[data-rv]").forEach(b => b.onclick = () => recDetail(b.dataset.rv));
    document.querySelectorAll("[data-rd]").forEach(b => b.onclick = () => {
      const r = db().recommendations.find(x => x.id === b.dataset.rd);
      const bk = r ? bookById(r.book_id) : null;
      A.confirmDialog("Hapus Rekomendasi", `Hapus rekomendasi untuk <b>"${esc(bk ? bk.judul : "")}"</b>?`, () => {
        const d2 = db();
        d2.recommendations = d2.recommendations.filter(x => x.id !== r.id);
        saveDB(d2); A.toast("success", "Rekomendasi dihapus"); renderRekomendasi();
      }, { danger: true });
    });
  }

  function targetBadges(targetClass) {
    const list = typeof targetClass === "string" ? targetClass.split(/[,\-–—]+/).map(s => s.trim()).filter(Boolean) : [];
    if (!list.length) return `<span class="badge badge-neutral">Semua kelas</span>`;
    return list.map(k => `<span class="badge badge-primary">${esc(k)}</span>`).join("");
  }

  function recForm(bookId) {
    const dbx = db();
    const gru = currentTeacher();
    const books = dbx.books.slice().sort((a, b) => a.judul.localeCompare(b.judul));

    A.openModal("Form Rekomendasi Buku", `
      <form id="recForm" class="mt-8">
        <div class="field">
          <label>Pilih Buku *</label>
          <select class="select" id="rBook" ${bookId ? "disabled" : ""}>
            ${books.map(b => `<option value="${b.id}" ${bookId === b.id ? "selected" : ""}>${esc(b.judul)} — ${esc(b.penulis)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>Kategori</label>
          <input class="input" id="rCategory" value="" disabled>
        </div>
        <div class="field">
          <label>Target Kelas *</label>
          <div class="checkbox-row">
            ${["X", "XI", "XII"].map(k => `<label class="checkbox-pill"><input type="checkbox" value="${k}" class="rKelas" checked> ${k}</label>`).join("")}
          </div>
        </div>
        <div class="field"><label>Alasan Rekomendasi *</label><textarea class="textarea" id="rAlasan" placeholder="Mengapa buku ini cocok dibaca siswa?"></textarea></div>
        <div class="field"><label>Deskripsi</label><textarea class="textarea" id="rDeskripsi" placeholder="Deskripsi pelengkap untuk siswa (opsional)."></textarea></div>
        <div class="flex justify-end gap-12 mt-8">
          <button class="btn btn-outline btn-sm" type="button" id="rClose">Batal</button>
          <button class="btn btn-sm" type="submit">Simpan Rekomendasi</button>
        </div>
      </form>`, {
      onOpen: (ov) => {
        const fillCategory = () => {
          const bid = bookId || ov.querySelector("#rBook").value;
          const b = bookById(bid);
          if (b) ov.querySelector("#rCategory").value = categoryName(b.kategori_id);
        };
        const sel = ov.querySelector("#rBook");
        if (sel) sel.onchange = fillCategory;
        fillCategory();
        ov.querySelector("#rClose").onclick = ov.close;
        ov.querySelector("#recForm").onsubmit = (e) => {
          e.preventDefault();
          const targetBookId = bookId || ov.querySelector("#rBook").value;
          const kelas = Array.from(ov.querySelectorAll(".rKelas:checked")).map(c => c.value);
          const alasan = ov.querySelector("#rAlasan").value.trim();
          if (!kelas.length) { A.toast("warning", "Pilih minimal satu target kelas"); return; }
          if (!alasan) { A.toast("warning", "Alasan rekomendasi wajib diisi"); return; }
          const b = bookById(targetBookId);
          const d2 = db();
          d2.recommendations.unshift({
            id: uid("rek-"), teacher_id: gru.id, book_id: targetBookId,
            title: b.judul, author: b.penulis, category: categoryName(b.kategori_id),
            target_class: kelas.join(" - "),
            reason: alasan, deskripsi: ov.querySelector("#rDeskripsi").value.trim(),
            status: "published", created_at: new Date().toISOString()
          });
          saveDB(d2); ov.close();
          A.toast("success", "Rekomendasi tersimpan", "Buku akan tampil berlabel 'Direkomendasikan Guru' di katalog siswa.");
          if (state.view === "rekomendasi") renderRekomendasi();
        };
      }
    });
  }

  function recDetail(id) {
    const r = db().recommendations.find(x => x.id === id);
    if (!r) return;
    const b = bookById(r.book_id);
    A.openModal("Detail Rekomendasi", `
      <div class="detail-usulan">
        ${b && b.cover ? `<img src="${esc(b.cover)}" alt="${esc(b.judul)}">` : `<img src="assets/books/book-fallback.svg" alt="">`}
        <div>
          <b style="font-size:16px;">${esc(r.title)}</b>
          <div class="muted text-sm">${esc(r.author)} • ${esc(r.category || categoryName(b ? b.kategori_id : ""))}</div>
          <div class="mt-8">${targetBadges(r.target_class)}<span class="badge badge-accent" style="margin-left:4px;">Direkomendasikan Guru</span></div>
        </div>
      </div>
      <h4 style="margin-top:16px;font-size:14px;">Alasan Rekomendasi</h4>
      <p class="muted text-sm">${esc(r.reason || "-")}</p>
      ${r.deskripsi ? `<h4 style="margin-top:14px;font-size:14px;">Deskripsi</h4><p class="muted text-sm">${esc(r.deskripsi)}</p>` : ""}
      <div class="muted text-xs mt-8">Dibuat ${fmtDate(r.created_at)}</div>
    `);
  }

  /* ================= PEMINJAMAN SISWA (monitor) ================= */
  function renderPeminjaman() {
    const dbx = db();
    let list = dbx.loans.slice().sort((a, b) => new Date(b.loan_date) - new Date(a.loan_date));
    const statusFilter = state.pmStatus || "all";
    if (statusFilter !== "all") list = list.filter(l => l.status === statusFilter);

    const html = `
      <div class="page-head"><h1>Data Peminjaman Siswa</h1><p>Pantau aktivitas peminjaman buku oleh siswa.</p></div>
      <div class="search-bar mb-16" style="max-width:460px;">${ICONS.search}<input type="text" id="pmSearch" placeholder="Cari nama siswa, judul buku..."></div>
      <div class="filters mb-8">
        <select class="filter-select" id="pmStatus">
          <option value="all">Semua Status</option>
          <option value="requested">Menunggu</option>
          <option value="active">Dipinjam</option>
          <option value="overdue">Terlambat</option>
          <option value="returned">Dikembalikan</option>
        </select>
      </div>
      <div class="table-wrap">
        <table class="table table-cards">
          <thead><tr><th>No</th><th>Nama Siswa</th><th>Judul Buku</th><th>Tgl Pinjam</th><th>Tgl Jatuh Tempo</th><th>Status</th></tr></thead>
          <tbody id="pmTbody">
            ${list.map((l, i) => {
              const b = bookById(l.book_id); const std = studentById(l.student_id);
              if (!b || !std) return "";
              return `<tr data-search="${esc((std.nama + " " + b.judul).toLowerCase())}">
                <td data-label="No">${i + 1}</td>
                <td data-label="Nama Siswa"><div class="td-title">${esc(std.nama)}</div><div class="sub">${esc(std.kelas)} ${esc(std.jurusan)}</div></td>
                <td data-label="Judul Buku">${esc(b.judul)}</td>
                <td data-label="Tgl Pinjam">${fmtDate(l.loan_date)}</td>
                <td data-label="Jatuh Tempo">${fmtDate(l.due_date)}</td>
                <td data-label="Status">${A.loanBadge(l)}</td>
              </tr>`;
            }).join("")}
            ${!list.length ? `<tr class="row-empty"><td colspan="6">Belum ada data peminjaman.</td></tr>` : ""}
          </tbody>
        </table>
      </div>`;

    render(html);
    if (document.getElementById("pmStatus")) {
      document.getElementById("pmStatus").value = statusFilter;
      document.getElementById("pmStatus").onchange = (e) => { state.pmStatus = e.target.value; renderPeminjaman(); };
    }
    const ps = document.getElementById("pmSearch");
    if (ps) ps.oninput = (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll("#pmTbody tr[data-search]").forEach(tr => { tr.style.display = tr.dataset.search.includes(q) ? "" : "none"; });
    };
  }

  /* ================= RIWAYAT AKTIVITAS ================= */
  function renderRiwayat() {
    const gru = currentTeacher();
    const proposals = myProposals(gru.id).map(p => ({ type: "usulan", date: p.created_at, title: `Mengajukan usulan buku "${p.title}"`, status: p.status }));
    const recs = myRecs(gru.id).map(r => {
      const b = bookById(r.book_id);
      return { type: "rekomendasi", date: r.created_at, title: `Merekomendasikan "${b ? b.judul : "-"}" untuk kelas ${r.target_class || "-"}` };
    });
    const timeline = [...proposals, ...recs].sort((a, b) => new Date(b.date) - new Date(a.date));

    const icon = { usulan: "📤", rekomendasi: "✨" };
    const html = `
      <div class="page-head"><h1>Riwayat Aktivitas</h1><p>Catatan usulan buku dan rekomendasi yang pernah kamu buat.</p></div>
      ${timeline.length ? timeline.map(t => `
        <div class="notif-item">
          <div class="notif-icon">${icon[t.type]}</div>
          <div class="notif-body">
            <b>${esc(t.title)}</b>
            <div class="time">${timeAgo(t.date)} • ${fmtDate(t.date)}</div>
          </div>
          ${t.status ? `<span class="badge badge-${reqStatusInfo(t.status).type}">${esc(reqStatusInfo(t.status).label)}</span>` : ""}
        </div>`).join("") : A.emptyState("assets/student-reading.svg", "Belum ada aktivitas", "Usulan dan rekomendasi yang kamu buat akan tercatat di sini.")}`;
    render(html);
  }

  /* ================= PROFIL GURU ================= */
  function renderProfil(showPassword) {
    const gru = currentTeacher();
    const s = session();
    const nama = gru ? gru.nama : s.name;
    const ini = (nama || "G").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    const totalRec = gru ? myRecs(gru.id).length : 0;
    const totalUsl = gru ? myProposals(gru.id).length : 0;

    const html = `
      <div class="page-head"><h1>Profil Guru</h1><p>Informasi akun dan data diri kamu.</p></div>
      <div class="grid" style="grid-template-columns:1.1fr 1fr;gap:20px;" id="profGrid">
        <div class="card">
          <div class="profile-head">
            <div class="profile-avatar">${ini}</div>
            <div style="flex:1;min-width:200px;">
              <h2 style="font-size:20px;font-weight:800;">${esc(nama)}</h2>
              <div class="muted text-sm">Guru ${gru && gru.mapel ? `• ${esc(gru.mapel)}` : ""}</div>
            </div>
          </div>
          <div class="meta-row"><b>NIP</b><span>${esc(gru ? gru.nip : "-")}</span></div>
          <div class="meta-row"><b>Mata Pelajaran</b><span>${esc(gru ? gru.mapel : "-")}</span></div>
          <div class="meta-row"><b>Email</b><span>${esc(gru ? gru.email : "-")}</span></div>
          <div class="meta-row"><b>No. HP</b><span>${esc(gru ? gru.no_hp : "-")}</span></div>
          <div class="flex gap-12 mt-16">
            <button class="btn btn-sm" id="editProfil">${ICONS.edit} Ubah Profil</button>
            <button class="btn btn-outline btn-danger-outline" id="btnLogout">${ICONS.logout} Keluar</button>
          </div>
        </div>
        <div class="card">
          <h3 style="font-size:16px;font-weight:700;margin-bottom:16px;">Data Mengajar & Kontribusi</h3>
          <div class="meta-row"><b>Kelas yang Diajar</b><span>${esc(gru ? gru.kelas : "-")}</span></div>
          <div class="meta-row"><b>Total Usulan Buku</b><span>${totalUsl} buku</span></div>
          <div class="meta-row"><b>Total Rekomendasi</b><span>${totalRec} buku</span></div>
          <div class="meta-row"><b>Buku yang Direkomendasikan</b><span>${totalRec} judul</span></div>
          <div class="meta-row"><b>Terakhir Login</b><span>${s.login_at ? fmtDateLong(s.login_at) : "-"}</span></div>
        </div>
      </div>`;

    render(html);
    if (window.innerWidth <= 900) { const g = document.getElementById("profGrid"); if (g) g.style.gridTemplateColumns = "1fr"; }
    const lg = document.getElementById("btnLogout");
    if (lg) lg.onclick = logout;
    const ep = document.getElementById("editProfil");
    if (ep) ep.onclick = () => editProfilForm(gru);
    if (showPassword) openPasswordModal();
  }

  function editProfilForm(gru) {
    if (!gru) { A.toast("error", "Data guru tidak ditemukan"); return; }
    A.openModal("Ubah Profil Guru", `
      <form id="editForm" class="mt-8">
        <div class="field"><label>Nama Lengkap *</label><input class="input" id="pNama" value="${esc(gru.nama)}" required></div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label>Mata Pelajaran</label><input class="input" id="pMapel" value="${esc(gru.mapel)}"></div>
          <div class="field"><label>No. HP</label><input class="input" id="pKontak" value="${esc(gru.no_hp)}"></div>
        </div>
        <div class="field"><label>Email</label><input class="input" id="pEmail" value="${esc(gru.email)}"></div>
        <div class="field">
          <label>Kelas yang Diajar</label>
          <div class="checkbox-row">
            ${["X", "XI", "XII"].map(k => `<label class="checkbox-pill"><input type="checkbox" value="${k}" class="pKelas" ${groupIncludes(gru.kelas, k) ? "checked" : ""}> ${k}</label>`).join("")}
          </div>
        </div>
        <div class="flex justify-end gap-12 mt-8">
          <button class="btn btn-outline btn-sm" type="button" id="pClose">Batal</button>
          <button class="btn btn-sm" type="submit">Simpan</button>
        </div>
      </form>`, {
      onOpen: (ov) => {
        ov.querySelector("#pClose").onclick = ov.close;
        ov.querySelector("#editForm").onsubmit = (e) => {
          e.preventDefault();
          const nama = ov.querySelector("#pNama").value.trim();
          if (!nama) { A.toast("warning", "Nama wajib diisi"); return; }
          const d2 = db();
          const idx = d2.teacher_profiles.findIndex(x => x.id === gru.id);
          if (idx > -1) {
            d2.teacher_profiles[idx] = {
              ...d2.teacher_profiles[idx], nama,
              mapel: ov.querySelector("#pMapel").value.trim(),
              no_hp: ov.querySelector("#pKontak").value.trim(),
              email: ov.querySelector("#pEmail").value.trim(),
              kelas: Array.from(ov.querySelectorAll(".pKelas:checked")).map(c => c.value).join(", ")
            };
          }
          const ui = d2.users.findIndex(x => x.id === gru.user_id);
          if (ui > -1) d2.users[ui].name = nama;
          saveDB(d2); ov.close();
          A.toast("success", "Profil diperbarui");
          renderProfil();
        };
      }
    });
  }

  function groupIncludes(kelasStr, k) {
    return String(kelasStr || "").split(/[,\-–—]+/).map(s => s.trim()).includes(k);
  }

  function openPasswordModal() {
    const modal = A.openModal("Ubah Password", `
      <div class="field"><label>Password lama</label><input class="input" id="oldPassword" type="password"></div>
      <div class="field"><label>Password baru</label><input class="input" id="newPassword" type="password"></div>
      <div class="field"><label>Konfirmasi password baru</label><input class="input" id="confirmPassword" type="password"></div>
      <div class="flex justify-end gap-8"><button class="btn btn-outline btn-sm" id="cancelPassword">Batal</button><button class="btn btn-sm" id="savePassword">Simpan Password</button></div>`);
    modal.overlay.querySelector("#cancelPassword").onclick = modal.close;
    modal.overlay.querySelector("#savePassword").onclick = () => {
      const oldPassword = modal.overlay.querySelector("#oldPassword").value;
      const newPassword = modal.overlay.querySelector("#newPassword").value;
      const confirmPassword = modal.overlay.querySelector("#confirmPassword").value;
      const dbx = db();
      const user = dbx.users.find(u => u.id === session().user_id);
      if (!user || user.password !== oldPassword) return A.toast("error", "Password lama salah");
      if (newPassword.length < 6) return A.toast("warning", "Password minimal 6 karakter");
      if (newPassword !== confirmPassword) return A.toast("error", "Konfirmasi tidak cocok");
      user.password = newPassword;
      saveDB(dbx); modal.close();
      A.toast("success", "Password diperbarui");
    };
  }

  /* ================= BOOT ================= */
  function boot() {
    if (!A.requireAuth()) return;
    const s = session();
    if (s.role !== "guru") { location.href = s.role === "admin" ? "app-admin.html" : "app-student.html"; return; }
    syncOverdue(db());
    renderLayout();
    renderDashboard();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();