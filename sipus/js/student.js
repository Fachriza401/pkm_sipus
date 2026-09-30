/* ============================================================
   SIPUS — Aplikasi Siswa (SPA)
   Fitur: Dashboard, Katalog, Detail, Pinjaman, Riwayat,
          Favorit, Notifikasi, Profil, Bantuan
   ============================================================ */
(function () {
  const S = window.SIPUS;
  const A = window.APP;
  const { getDB, saveDB, ICONS, esc, fmtDate, fmtDateLong, timeAgo, bookById, categoryName, bookStatus, loanStatusInfo, uid } = S;

  const CAMERA_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';

  let state = { view: "dashboard", bookId: null, cat: "all", status: "all", q: "", sort: "terbaru", page: 1, pageSize: 12 };

  function session() { return A.getSession(); }
  function db() { return getDB(); }

  function currentStudent() {
    const s = session(); if (!s) return null;
    return db().students.find(x => x.user_id === s.user_id) || null;
  }

  function studentLoans(stdId) { return db().loans.filter(l => l.student_id === stdId); }
  function activeLoans(stdId) { return studentLoans(stdId).filter(l => ["active", "overdue"].includes(l.status)); }
  function requestedLoans(stdId) { return studentLoans(stdId).filter(l => l.status === "requested"); }
  function returnedLoans(stdId) { return studentLoans(stdId).filter(l => l.status === "returned"); }

  /* ================= LAYOUT ================= */
  const NAV_ITEMS = [
    { label: "Menu", key: "dashboard", icon: "home", text: "Beranda" },
    { key: "katalog", icon: "book", text: "Katalog" },
    { key: "pinjaman", icon: "loan", text: "Pinjaman Saya" },
    { key: "riwayat", icon: "history", text: "Riwayat" },
    { key: "favorit", icon: "favorite", text: "Favorit" },
    { key: "notifikasi", icon: "bell", text: "Notifikasi" }
  ];

  const BOTTOM_NAV = [
    { key: "dashboard", icon: "home", text: "Beranda" },
    { key: "katalog", icon: "book", text: "Katalog" },
    { key: "pinjaman", icon: "loan", text: "Pinjaman" },
    { key: "notifikasi", icon: "bell", text: "Notifikasi" },
    { key: "profil", icon: "user", text: "Profil" }
  ];

  const TITLES = {
    dashboard: "Beranda", katalog: "Katalog Buku", pinjaman: "Pinjaman Saya",
    riwayat: "Riwayat Peminjaman", favorit: "Buku Favorit", notifikasi: "Notifikasi",
    profil: "Profil Saya", bantuan: "Pusat Bantuan"
  };

  function unreadCount() {
    const std = currentStudent();
    if (!std) return 0;
    return db().notifications.filter(n => n.student_id === std.id && !n.is_read).length;
  }

  function renderLayout() {
    const s = session();
    const std = currentStudent();
    const badge = requestedLoans(std ? std.id : "").length;
    const unread = unreadCount();
    const navItems = NAV_ITEMS.map(it => ({ ...it, badge: it.key === "pinjaman" ? badge : it.key === "notifikasi" ? unread : 0 }));

    const sidebar = A.buildSidebar(navItems, state.view === "detail" ? "katalog" : state.view, s);
    const topbar = A.buildTopbar(TITLES[state.view] || "Beranda", unread);
    const bottomNav = BOTTOM_NAV.map(b => `
      <button class="bn-item ${state.view === b.key ? "active" : ""}" data-bn="${b.key}">
        ${ICONS[b.icon]}<span>${b.text}</span>${b.key === "notifikasi" && unread > 0 ? `<span class="bn-badge">${unread > 99 ? "99+" : unread}</span>` : ""}
      </button>`).join("");

    A.setAppShell(`${sidebar}<main class="main">${topbar}<div class="content" id="content"></div></main>`);
    document.getElementById("bottomNav").innerHTML = bottomNav;

    A.afterLayout({
      onNotif: () => go("notifikasi"),
      onNotifDropdown: (panel) => buildNotifPanel(panel),
      onAvatar: () => {},
      profileMenu: [
        { key: "profil", icon: "user", text: "Profil Saya" },
        { key: "bantuan", icon: "help", text: "Pusat Bantuan" },
        { key: "keluar", icon: "logout", text: "Keluar" }
      ],
      onSearch: (q) => { state.q = q; go("katalog"); }
    });
    A.startNotifSync();

    document.getElementById("bottomNav").querySelectorAll("[data-bn]").forEach(b => b.onclick = () => go(b.dataset.bn));
  }

  function render(html) {
    const c = document.getElementById("content");
    c.innerHTML = html;
    bindCommon();
  }

  function bindCommon() {
    document.querySelectorAll(".book-card").forEach(el => {
      el.onclick = (e) => { if (!e.target.closest("button")) openBook(el.dataset.bookId); };
    });
    document.querySelectorAll("[data-open]").forEach(el => el.onclick = (e) => { e.stopPropagation(); openBook(el.dataset.open, el); });
    document.querySelectorAll("[data-detail]").forEach(el => el.onclick = (e) => { e.stopPropagation(); openBook(el.dataset.detail); });
    document.querySelectorAll("[data-pinjam]").forEach(el => el.onclick = (e) => { e.stopPropagation(); borrowBook(el.dataset.pinjam); });
    document.querySelectorAll("[data-fav]").forEach(el => el.onclick = (e) => { e.stopPropagation(); toggleFav(el); });
  }

  /* ================= ROUTER ================= */
  window.__NAV__ = {
    dashboard: () => { state.view = "dashboard"; state.bookId = null; renderLayout(); renderDashboard(); scrollTop(); },
    katalog: () => { state.view = "katalog"; state.bookId = null; renderLayout(); renderKatalog(); scrollTop(); },
    detail: () => { state.view = "detail"; renderLayout(); renderDetail(); scrollTop(); },
    pinjaman: () => { state.view = "pinjaman"; state.bookId = null; renderLayout(); renderPinjaman(); scrollTop(); },
    riwayat: () => { state.view = "riwayat"; state.bookId = null; renderLayout(); renderRiwayat(); scrollTop(); },
    favorit: () => { state.view = "favorit"; state.bookId = null; renderLayout(); renderFavorit(); scrollTop(); },
    notifikasi: () => { state.view = "notifikasi"; state.bookId = null; renderLayout(); renderNotifikasi(); scrollTop(); },
    profil: () => { state.view = "profil"; state.bookId = null; renderLayout(); renderProfil(); scrollTop(); },
    bantuan: () => { state.view = "bantuan"; state.bookId = null; renderLayout(); renderBantuan(); scrollTop(); },
    pinjamCepat: () => quickBorrow(),
    keluar: () => logout()
  };

  function go(key) { if (window.__NAV__[key]) window.__NAV__[key](); }
  function openBook(id) { state.bookId = id; state.view = "detail"; renderLayout(); renderDetail(); scrollTop(); }
  function scrollTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }

  function logout() {
    let name = "";
    try { const cu = A.currentUser(); if (cu && cu.name) name = cu.name; } catch (e) {}
    A.logoutDialog({
      name: name || "Pengguna",
      sub: "Kamu akan keluar dari akun siswa. Jangan lupa buku yang masih kamu pinjam ya!",
      onConfirm: () => {
        try { A.clearSession(); } catch (e) {}
        window.location.replace("login.html");
      }
    });
  }

  /* ================= DASHBOARD ================= */
  function renderDashboard() {
    const db1 = db();
    const std = currentStudent();
    const s = session();
    const settings = db1.settings || {};
    const loans = activeLoans(std.id);
    const reqs = requestedLoans(std.id);
    const returns = returnedLoans(std.id);
    const favs = db1.favorites.filter(f => f.student_id === std.id);
    const announcements = (settings.announcements || []).slice().reverse();
    const firstName = (s.name || "Siswa").split(" ")[0];
    const hariNama = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const dueSoon = loans
      .map(l => ({ ...l, due: new Date(l.due_date) }))
      .filter(l => l.due >= new Date() || l.status === "overdue")
      .sort((a, b) => a.due - b.due)
      .slice(0, 4);
    const dueSoonCount = loans.filter(l => l.status === "overdue" || (new Date(l.due_date) - new Date()) / 86400000 <= 3).length;
    const totalRead = returns.length + loanHistoryCount(std.id);
    const activities = buildActivities(std.id, loans);

    const token = (renderDashboard.__t = (renderDashboard.__t || 0) + 1);
    render(skeletonDashboard());
    setTimeout(() => {
      if (renderDashboard.__t !== token) return;
      render(realHtml());
      bindDashboard();
    }, 280);

    function realHtml() {
      return `
      <div class="hero">
        <div>
          <span class="hero-kicker">${ICONS.book} Portal Siswa</span>
          <h2>Halo, ${esc(firstName)}! Selamat datang di perpustakaan.</h2>
          <p>${esc(hariNama)} • Jelajahi koleksi buku, pantau jatuh tempo, dan temukan rekomendasi baru untukmu hari ini.</p>
          <div class="hero-chips no-print">
            <span class="hero-chip">${ICONS.book} ${db1.books.length} judul koleksi</span>
            <span class="hero-chip">${ICONS.clock} ${esc(settings.loan_duration || 7)} hari masa pinjam</span>
          </div>
        </div>
        <img class="hero-art" src="assets/hero-student.svg" alt="Foto siswa di perpustakaan">
        <div class="hero-cta no-print">
          <button class="btn btn-accent" onclick="window.__NAV__.katalog();">${ICONS.book} Jelajahi Katalog</button>
          <button class="btn btn-ghost-flash" onclick="quickBorrow()">${ICONS.zap} Ajukan Pinjam</button>
        </div>
      </div>

      <div class="dash-stats">
        ${statMini("blue", ICONS.loan, activeLoans(std.id).length, "Sedang Dipinjam", reqs.length ? `${reqs.length} menunggu persetujuan` : "Tidak ada antrean")}
        ${statMini("orange", ICONS.clock, dueSoonCount, "Jatuh Tempo", overdueCountOf(loans) ? `${overdueCountOf(loans)} terlambat` : "Semua aman")}
        ${statMini("green", ICONS.history, totalRead, "Total Dibaca", "Buku selesai dibaca")}
        ${statMini("yellow", ICONS.favorite, favs.length, "Favorit", "Buku disimpan")}
      </div>

      <div class="dash-grid-2" id="dashGrid">
        <div class="dash-section">
          <div class="section-head"><h3>Sedang Dipinjam</h3><a class="link-arrow" onclick="window.__NAV__.pinjaman();">Lihat semua →</a></div>
          ${loans.length ? loans.slice(0, 3).map(loanCardHtml).join("") : A.emptyState("📚", "Tidak ada pinjaman aktif", "Belum ada buku yang kamu pinjam. Jelajahi katalog untuk menemukan buku favoritmu!", `<button class="btn btn-sm" onclick="window.__NAV__.katalog()">${ICONS.book} Jelajahi Buku</button>`)}
        </div>
        <div class="dash-section">
          <div class="section-head"><h3>Jatuh Tempo Terdekat</h3></div>
          ${dueSoon.length ? dueSoon.map(dueItemHtml).join("") : A.emptyState("🎉", "Tidak ada jatuh tempo", "Semua pinjamanmu masih aman.")}
        </div>
      </div>

      ${announcements.length ? `
      <div class="dash-section" style="margin-bottom:22px;">
        <div class="section-head"><h3>Pengumuman</h3><span class="badge badge-accent">${announcements.length} aktif</span></div>
        ${announcements.map(a => `
          <div class="announce-banner" style="margin-bottom:10px;">
            <span style="font-size:18px;">📢</span>
            <div><b>${esc(a.title)}</b><p>${esc(a.message)}</p><div class="time muted text-xs" style="margin-top:4px;">${timeAgo(a.created_at)}</div></div>
          </div>`).join("")}
      </div>` : ""}

      <div class="dash-section" style="margin-bottom:22px;">
        <div class="section-head"><h3>Jelajahi Kategori</h3><a class="link-arrow" onclick="window.__NAV__.katalog();">Semua katalog →</a></div>
        <div class="cat-explore">
          ${db1.categories.map(c => {
            const n = db1.books.filter(b => b.kategori_id === c.id).length;
            return `<button class="cat-tile" data-cat="${c.id}">
              <span class="ct-icon">${ICONS.grid}</span>
              <span class="ct-txt"><b>${esc(c.name)}</b><span class="time">${n} judul</span></span>
            </button>`;
          }).join("")}
        </div>
      </div>

      <div class="dash-grid-2">
        <div class="dash-section">
          <div class="section-head"><h3>Aktivitas Terakhir</h3></div>
          ${activities.length ? activitiesHtml(activities) : A.emptyState("🔔", "Belum ada aktivitas", "Aktivitas pinjaman dan notifikasimu akan tampil di sini.")}
        </div>
        <div class="dash-section">
          <div class="section-head"><h3>Info Perpustakaan</h3></div>
          <div class="loan-modal-row"><b>Jam layanan</b><span>${esc(settings.library_hours || "-")}</span></div>
          <div class="loan-modal-row"><b>Batas pinjam</b><span>${esc(settings.loan_limit || 3)} buku / siswa</span></div>
          <div class="loan-modal-row"><b>Masa pinjam</b><span>${esc(settings.loan_duration || 7)} hari</span></div>
          <div class="loan-modal-row"><b>Sekolah</b><span>${esc(settings.school_name || "-")}</span></div>
          <div class="loan-modal-row"><b>Kontak</b><span>${esc(settings.contact || "-")}</span></div>
        </div>
      </div>`;
    }

    function bindDashboard() {
      document.querySelectorAll("[data-loan-detail]").forEach(el => el.onclick = (e) => { e.stopPropagation(); openLoanModal(el.dataset.loanDetail); });
      document.querySelectorAll("[data-cat]").forEach(el => el.onclick = () => { state.cat = el.dataset.cat; state.page = 1; window.__NAV__.katalog(); });
      if (window.innerWidth <= 980) { const g = document.getElementById("dashGrid"); if (g) g.classList.add("single-col"); }
    }
  }

  function overdueCountOf(list) { return list.filter(l => l.status === "overdue").length; }

  function statMini(color, icon, num, lbl, trend) {
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

  function loanCardHtml(l) {
    const b = bookById(l.book_id);
    if (!b) return "";
    const info = loanStatusInfo(l);
    return `
      <div class="loan-item">
        ${b.cover ? `<img class="mini-cover" src="${esc(b.cover)}" alt="">` : `<div class="mini-cover no-cover-md">${esc(b.kode)}</div>`}
        <div class="info">
          <b>${esc(b.judul)}</b>
          <span>${esc(b.penulis)}</span>
          <span style="display:block;margin-top:4px;">📅 Pinjam ${fmtDate(l.loan_date)} • Jatuh tempo <b>${fmtDate(l.due_date)}</b></span>
        </div>
        <div class="loan-actions">
          <span class="badge badge-${info.type}">${esc(info.label)}</span>
          <button class="btn btn-outline btn-sm" data-loan-detail="${l.id}">Lihat Detail</button>
        </div>
      </div>`;
  }

  function dueItemHtml(l) {
    const b = bookById(l.book_id);
    if (!b) return "";
    const info = loanStatusInfo(l);
    return `
      <div class="loan-item" style="cursor:pointer;" data-loan-detail="${l.id}">
        ${b.cover ? `<img class="mini-cover" src="${esc(b.cover)}" alt="">` : `<div class="mini-cover no-cover-md">${esc(b.kode)}</div>`}
        <div class="info"><b>${esc(b.judul)}</b><span>Jatuh tempo: ${fmtDate(l.due_date)}</span></div>
        <span class="badge badge-${info.type}">${esc(info.label)}</span>
      </div>`;
  }

  function buildActivities(stdId, loans) {
    const acts = [];
    loans.slice(0, 3).forEach(l => {
      const b = bookById(l.book_id);
      acts.push({ date: l.loan_date, type: l.status === "overdue" ? "danger" : "info", icon: ICONS.loan, title: `Meminjam ${b ? `"${b.judul}"` : "buku"}`, desc: `Kode ${l.loan_code}`, time: timeAgo(l.loan_date) });
    });
    (db().notifications || []).filter(n => n.student_id === stdId).slice(0, 4).forEach(n => {
      acts.push({ date: n.created_at, type: n.type === "late" ? "danger" : n.type === "due" ? "warning" : "success", icon: ICONS.bell, title: n.title, desc: n.message, time: timeAgo(n.created_at) });
    });
    return acts.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  }

  function activitiesHtml(activities) {
    return `<ul class="timeline">${activities.map(a => `
      <li class="timeline-item ${a.type}">
        <span class="timeline-dot">${a.icon}</span>
        <div class="timeline-body"><b>${esc(a.title)}</b>${a.desc ? `<p>${esc(a.desc)}</p>` : ""}<div class="time">${esc(a.time)}</div></div>
      </li>`).join("")}</ul>`;
  }

  function skeletonDashboard() {
    return `
      <div class="skel-hero"><div style="padding:30px;"><div class="skel skel-line w60"></div><div class="skel skel-line w80"></div><div class="skel skel-line w40"></div></div></div>
      <div class="dash-stats">
        ${[0, 1, 2, 3].map(() => `<div class="skel-card"><div class="skel skel-line w40"></div><div class="skel skel-line w80"></div></div>`).join("")}
      </div>
      <div class="dash-grid-2">
        <div class="skel-card"><div class="skel skel-line w60"></div><div class="skel skel-line"></div><div class="skel skel-line"></div><div class="skel skel-line w80"></div></div>
        <div class="skel-card"><div class="skel skel-line w60"></div><div class="skel skel-line"></div><div class="skel skel-line w80"></div></div>
      </div>`;
  }

  /* ================= MODAL: detail buku ================= */
  function openBookModal(bookId) {
    const b = bookById(bookId);
    if (!b) return;
    const std = currentStudent();
    const isFav = std && db().favorites.some(f => f.student_id === std.id && f.book_id === b.id);
    const st = bookStatus(b);
    const activeCount = std ? activeLoans(std.id).length : 0;
    const limit = db().settings.loan_limit || 3;
    const canBorrow = b.available > 0 && activeCount < limit;
    const already = std && activeLoans(std.id).some(l => l.book_id === b.id);
    const cat = categoryName(b.kategori_id);

    const html = `
      <div class="bk-modal-head">
        ${b.cover ? `<img class="bk-modal-cover" src="${esc(b.cover)}" alt="">` : `<div class="bk-modal-cover no-cover">${esc(b.kode)}</div>`}
        <div style="flex:1;min-width:0;">
          <div class="flex items-center gap-8" style="margin-bottom:6px;">
            <span class="badge badge-${st.type}">${esc(st.label)}</span><span class="badge badge-primary">${esc(cat)}</span>
          </div>
          <div class="bk-modal-title">${esc(b.judul)}</div>
          <div class="bk-modal-meta">${esc(b.penulis)} • ${esc(b.penerbit)} • ${esc(b.tahun)}</div>
          <div class="bk-modal-meta" style="margin:0;">Rak ${esc(b.rak)} • ${esc(b.isbn || "-")}</div>
        </div>
      </div>
      <div class="bk-stock">
        <div class="bs"><b style="color:var(--success);">${b.available}</b><span>Tersedia</span></div>
        <div class="bs"><b>${b.total}</b><span>Total</span></div>
        <div class="bs"><b style="color:var(--warning);">${b.borrowed}</b><span>Dipinjam</span></div>
      </div>
      ${b.sinopsis ? `<p class="bk-sinopsis">${esc(b.sinopsis)}</p>` : ""}
      <div class="bk-modal-actions">
        <button class="btn btn-sm" id="bkPinjam" ${!canBorrow || already ? "disabled" : ""}>${already ? "✓ Sedang Dipinjam" : b.available <= 0 ? "Stok Habis" : "📥 Pinjam Buku"}</button>
        <button class="btn btn-outline btn-sm" id="bkFav">${isFav ? "❤ Sudah Difavoritkan" : "🤍 Tambah Favorit"}</button>
        <button class="btn btn-ghost btn-sm" id="bkFull">${ICONS.eye} Halaman Lengkap</button>
      </div>`;

    A.openModal(`Lihat Buku — ${esc(b.kode)}`, html, {
      onOpen: (ov) => {
        ov.querySelector("#bkPinjam").onclick = () => { ov.close(); borrowBook(b.id); };
        ov.querySelector("#bkFav").onclick = () => { toggleFav({ dataset: { fav: b.id } }); };
        ov.querySelector("#bkFull").onclick = () => { ov.close(); openBook(b.id); };
      }
    });
  }

  function openLoanModal(loanId) {
    const l = db().loans.find(x => x.id === loanId);
    if (!l) return;
    const b = bookById(l.book_id);
    const info = loanStatusInfo(l);
    const html = `
      ${b ? `<div class="flex items-center gap-12 mb-12">
        ${b.cover ? `<img class="bk-modal-cover" style="width:78px;height:104px;" src="${esc(b.cover)}" alt="">` : `<div class="bk-modal-cover no-cover" style="width:78px;height:104px;font-size:10px;display:flex;align-items:center;">${esc(b.kode)}</div>`}
        <div><b style="font-size:16px;">${esc(b.judul)}</b><div class="bk-modal-meta">${esc(b.penulis)} • ${esc(b.tahun)}</div><span class="badge badge-${info.type}">${esc(info.label)}</span></div>
      </div>` : ""}
      <div class="loan-modal-row"><b>Kode Pinjam</b><span>${esc(l.loan_code)}</span></div>
      <div class="loan-modal-row"><b>Tanggal Pinjam</b><span>${fmtDate(l.loan_date)}</span></div>
      <div class="loan-modal-row"><b>Jatuh Tempo</b><span>${fmtDate(l.due_date)}</span></div>
      <div class="loan-modal-row"><b>Status</b><span class="badge badge-${info.type}">${esc(info.label)}</span></div>
      <div class="loan-modal-row"><b>Keterangan</b><span>Untuk mengembalikan, bawa buku ke meja perpustakaan.</span></div>
      ${b ? `<div class="bk-modal-actions"><button class="btn btn-outline btn-sm" id="lmBook">${ICONS.book} Lihat Buku</button></div>` : ""}`;
    A.openModal("Detail Peminjaman", html, {
      onOpen: (ov) => {
        const lb = ov.querySelector("#lmBook");
        if (lb) lb.onclick = () => { ov.close(); openBook(b.id); };
      }
    });
  }

  /* ================= NOTIF DROPDOWN ================= */
  function buildNotifPanel(panel) {
    const std = currentStudent();
    const dbn = db();
    const myNotifs = Array.isArray(dbn.notifications) ? dbn.notifications.filter(n => std && n.student_id === std.id) : [];
    const notifs = myNotifs.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);
    const ai = { due: "⏰", late: "🚨", system: "💬", news: "📢", info: "💡" };
    const html = `
      <div class="np-head"><b>Notifikasi</b><button id="npMarkAll">Tandai dibaca</button></div>
      <div class="np-list">
        ${notifs.length ? notifs.map(n => `
          <div class="np-item ${n.is_read ? "" : "unread"}" data-nid="${n.id}">
            <span class="np-icon ${n.type === "late" ? "danger" : n.type === "due" ? "warning" : ""}">${ai[n.type] || ai.info}</span>
            <div class="np-body"><b>${esc(n.title)}</b><p>${esc(n.message)}</p><div class="time">${timeAgo(n.created_at)}</div></div>
          </div>`).join("") : `<div class="np-item"><span class="np-icon">${ICONS.bell}</span><div class="np-body"><b>Tidak ada notifikasi</b><p>Semua aman.</p></div></div>`}
      </div>
      <div class="np-foot"><a style="cursor:pointer;" onclick="window.__NAV__.notifikasi(); document.getElementById('topNotifPanel') && (document.getElementById('topNotifPanel').hidden = true);">Lihat semua notifikasi →</a></div>`;

    panel.innerHTML = html;
    panel.querySelectorAll("[data-nid]").forEach(el => el.onclick = () => {
      const n = dbn.notifications.find(x => x.id === el.dataset.nid);
      if (n && !n.is_read) { n.is_read = true; saveDB(dbn); A.refreshNotifBadges(); buildNotifPanel(panel); }
    });
    const ma = panel.querySelector("#npMarkAll");
    if (ma) ma.onclick = () => {
      dbn.notifications.forEach(n => { if (n.student_id === std.id) n.is_read = true; });
      saveDB(dbn); A.refreshNotifBadges(); A.toast("success", "Semua notifikasi dibaca"); buildNotifPanel(panel);
    };
  }

  function loanHistoryCount(stdId) {
    return studentLoans(stdId).filter(l => l.status === "returned").length;
  }

  /* ================= KATALOG ================= */
  function renderKatalog() {
    const db1 = db();
    const cats = db1.categories;

    const statusOpts = [
      { v: "all", l: "Semua Status" }, { v: "tersedia", l: "Tersedia" },
      { v: "terbatas", l: "Stok Terbatas" }, { v: "habis", l: "Dipinjam Semua" }
    ];

    let list = db1.books.slice();

    if (state.q) {
      const q = state.q.toLowerCase();
      list = list.filter(b =>
        b.judul.toLowerCase().includes(q) || b.penulis.toLowerCase().includes(q) ||
        (b.isbn || "").toLowerCase().includes(q) || b.kode.toLowerCase().includes(q) ||
        categoryName(b.kategori_id).toLowerCase().includes(q) || b.penerbit.toLowerCase().includes(q));
    }
    if (state.cat !== "all") list = list.filter(b => b.kategori_id === state.cat);
    if (state.status === "tersedia") list = list.filter(b => b.available > 0);
    if (state.status === "terbatas") list = list.filter(b => b.available > 0 && b.available <= 2);
    if (state.status === "habis") list = list.filter(b => b.available === 0);
    if (state.sort === "terbaru") list.sort((a, b) => b.tahun - a.tahun);
    if (state.sort === "populer") list.sort((a, b) => b.borrowed - a.borrowed || a.available - b.available);
    if (state.sort === "judul") list.sort((a, b) => a.judul.localeCompare(b.judul));

    const totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
    const p = Math.min(state.page, totalPages);
    const pageItems = list.slice((p - 1) * state.pageSize, p * state.pageSize);

    const catChips = `<button class="filter-chip ${state.cat === "all" ? "active" : ""}" data-cat="all">Semua</button>
      ${cats.map(c => `<button class="filter-chip ${state.cat === c.id ? "active" : ""}" data-cat="${c.id}">${esc(c.name)}</button>`).join("")}`;

    const html = `
      <div class="page-head flex justify-between items-center flex-wrap gap-8" style="margin-bottom:18px;">
        <div>
          <h1>Katalog Buku</h1>
          <p>${list.length} judul buku tersedia di perpustakaan kami</p>
        </div>
      </div>

      <div class="search-bar mb-16">
        ${ICONS.search}
        <input type="text" id="catSearch" placeholder="Cari judul, penulis, ISBN, atau kata kunci..." value="${esc(state.q)}">
      </div>

      <div class="filters">
        <select class="filter-select" id="fCat">
          <option value="all">Semua Kategori</option>
          ${cats.map(c => `<option value="${c.id}" ${state.cat === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}
        </select>
        <select class="filter-select" id="fStatus">
          ${statusOpts.map(o => `<option value="${o.v}" ${state.status === o.v ? "selected" : ""}>${o.l}</option>`).join("")}
        </select>
        <select class="filter-select" id="fSort">
          <option value="terbaru" ${state.sort === "terbaru" ? "selected" : ""}>Terbaru</option>
          <option value="populer" ${state.sort === "populer" ? "selected" : ""}>Terpopuler</option>
          <option value="judul" ${state.sort === "judul" ? "selected" : ""}>Judul A–Z</option>
        </select>
        <span class="muted text-sm" style="align-self:center;">Menampilkan ${pageItems.length} dari ${list.length}</span>
      </div>

      <div class="filters" id="catChips">${catChips}</div>

      ${list.length ? `<div class="book-grid" id="bookGrid">${pageItems.map(b => A.bookCardHtml(b)).join("")}</div>
        <div class="pagination" id="pag"></div>` : A.emptyState("assets/student-reading.svg", "Buku tidak ditemukan", "Coba kata kunci lain atau ubah filter pencarian.")}`;

    render(html);
    bindCommon();

    const ci = document.getElementById("catSearch");
    ci.onkeydown = (e) => { if (e.key === "Enter") { state.q = ci.value.trim(); state.page = 1; renderKatalog(); } };
    ci.oninput = (e) => { state.q = ci.value.trim(); state.page = 1; debounce(renderKatalog, 350); };

    document.getElementById("fCat").onchange = (e) => { state.cat = e.target.value; state.page = 1; renderKatalog(); };
    document.getElementById("fStatus").onchange = (e) => { state.status = e.target.value; state.page = 1; renderKatalog(); };
    document.getElementById("fSort").onchange = (e) => { state.sort = e.target.value; state.page = 1; renderKatalog(); };
    document.querySelectorAll("#catChips [data-cat]").forEach(ch => ch.onclick = () => { state.cat = ch.dataset.cat; state.page = 1; renderKatalog(); });

    A.renderPagination(document.getElementById("pag"), p, totalPages, np => { state.page = np; renderKatalog(); });
  }

  let debounceT = null;
  function debounce(fn, ms) { clearTimeout(debounceT); debounceT = setTimeout(fn, ms); }

  /* ================= DETAIL ================= */
  function renderDetail() {
    const b = bookById(state.bookId);
    if (!b) { renderKatalog(); return; }
    const std = currentStudent();
    const st = bookStatus(b);
    const isFav = std && db().favorites.some(f => f.student_id === std.id && f.book_id === b.id);
    const activeCount = std ? activeLoans(std.id).length : 0;
    const limit = db().settings.loan_limit || 3;
    const canBorrow = b.available > 0 && activeCount < limit && std !== null;
    const cat = categoryName(b.kategori_id);

    const html = `
      <div class="page-head">
        <a style="cursor:pointer;" onclick="window.__NAV__.katalog();">← Kembali ke katalog</a>
      </div>
      <div class="detail-layout">
        <div>
          <div class="detail-cover">
            ${b.cover ? `<img src="${esc(b.cover)}" alt="${esc(b.judul)}">` : `<div class="no-cover"><b style="font-size:18px;">${esc(b.kode)}</b><div style="margin-top:8px;">${esc(b.judul)}</div></div>`}
          </div>
          <button class="btn btn-outline btn-block mt-12 ${isFav ? "hidden" : ""}" id="favBtn">🤍 Simpan ke Favorit</button>
          <button class="btn btn-block mt-12 ${!isFav ? "hidden" : ""}" id="favBtnOn" style="background:var(--danger);">❤ Sudah Difavoritkan</button>
        </div>
        <div>
          <div class="flex items-center gap-8" style="margin-bottom:8px;">
            ${A.badgeHtml(b)}
            <span class="badge badge-primary">${esc(cat)}</span>
            <span class="badge badge-neutral">Rak ${esc(b.rak)}</span>
          </div>
          <h1 class="detail-title">${esc(b.judul)}</h1>
          <div class="detail-sub">${esc(b.penulis)} • ${esc(b.penerbit)} • ${esc(b.tahun)}</div>

          <div class="stock-box">
            <div class="stat-icon blue" style="width:54px;height:54px;">${ICONS.box}</div>
            <div class="stock-num"><b>${b.available}</b><span>Stok tersedia</span></div>
            <div style="width:1px;height:36px;background:var(--border);"></div>
            <div class="stock-num"><b>${b.total}</b><span>Total eksemplar</span></div>
            <div style="width:1px;height:36px;background:var(--border);"></div>
            <div class="stock-num"><b>${b.borrowed}</b><span>Sedang dipinjam</span></div>
          </div>

          <button class="btn btn-lg" id="borrowBtn" style="${b.available <= 0 ? "background:#9BB2C8;cursor:not-allowed;" : ""}">
            ${b.available <= 0 ? "Tidak Tersedia" : "📥 Pinjam Buku"}
          </button>
          <div class="muted text-sm mt-8" id="borrowHint"></div>

          <div class="detail-sinopsis mt-24">
            <h4><b>Sinopsis</b></h4>
            <p>${esc(b.sinopsis)}</p>
          </div>

          <div class="detail-meta">
            <div class="meta-row"><b>ISBN</b><span>${esc(b.isbn || "-")}</span></div>
            <div class="meta-row"><b>Penerbit</b><span>${esc(b.penerbit)}</span></div>
            <div class="meta-row"><b>Tahun</b><span>${esc(b.tahun)}</span></div>
            <div class="meta-row"><b>Kategori</b><span>${esc(cat)}</span></div>
            <div class="meta-row"><b>Lokasi Rak</b><span>${esc(b.rak)}</span></div>
            <div class="meta-row"><b>Kode Buku</b><span>${esc(b.kode)}</span></div>
            <div class="meta-row"><b>Kondisi</b><span>${esc(b.kondisi)}</span></div>
          </div>
        </div>
      </div>`;

    render(html);

    const hint = document.getElementById("borrowHint");
    if (!std) hint.textContent = "Login untuk meminjam buku.";
    else if (b.available <= 0) hint.textContent = "Semua eksemplar sedang dipinjam. Periksa kembali nanti.";
    else if (activeCount >= limit) hint.textContent = `Batas pinjam kamu (${activeCount}/${limit}) sudah terpenuhi. Kembalikan buku dulu untuk meminjam lagi.`;
    else if (std.user_id !== session().user_id) hint.textContent = "";

    document.getElementById("borrowBtn").onclick = () => borrowBook(b.id);
    document.getElementById("favBtn").onclick = () => toggleFav({ dataset: { fav: b.id } });
    document.getElementById("favBtnOn").onclick = () => toggleFav({ dataset: { fav: b.id } });
  }

  /* ================= PINJAM ================= */
  function pagePinjam() {
    const std = currentStudent();
    if (!std) return;
    const limit = db().settings.loan_limit || 3;
    const active = activeLoans(std.id);
    const overdue = active.filter(l => l.status === "overdue");
    const reqs = requestedLoans(std.id);

    return { std, limit, active, overdue, reqs };
  }

  function renderPinjaman() {
    const { std, limit, active, overdue, reqs } = pagePinjam();
    const sortedActive = [...active].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    const html = `
      <div class="page-head">
        <h1>Pinjaman Saya</h1>
        <p>Pantau buku yang sedang kamu pinjam dan tanggal jatuh temponya.</p>
      </div>

      ${reqs.length ? `
      <div class="section">
        <div class="section-head"><h3>Menunggu Persetujuan</h3></div>
        ${reqs.map(l => A.loanRowHtml(l, { showStudent: false })).join("")}
      </div>` : ""}

      <div class="small-card mb-16">
        <div class="flex items-center justify-between flex-wrap gap-8">
          <div><b>Kuota peminjaman</b><br><span class="muted text-sm">Jumlah buku yang sedang kamu pinjam</span></div>
          <div style="text-align:right;"><b style="font-size:20px;">${active.length}/${limit}</b><br><span class="muted text-sm">batas maksimal</span></div>
        </div>
        <div style="height:10px;background:var(--bg);border-radius:999px;margin-top:12px;overflow:hidden;">
          <div style="width:${Math.min(100, active.length / Math.max(1, limit) * 100)}%;height:100%;background:${active.length >= limit ? "var(--danger)" : "var(--primary)"};border-radius:999px;"></div>
        </div>
      </div>

      ${overdue.length ? `
      <div class="alert alert-error mb-16">⚠️ Kamu memiliki <b>${overdue.length}</b> buku terlambat. Segera kembalikan untuk menghindari sanksi.</div>` : ""}

      <div class="section">
        <div class="section-head"><h3>Buku Sedang Dipinjam</h3><span class="muted text-sm">${active.length} buku</span></div>
        ${sortedActive.length ? sortedActive.map(l => {
          const b = bookById(l.book_id);
          const info = loanStatusInfo(l);
          return `
          <div class="loan-item">
            ${b.cover ? `<img class="mini-cover" src="${esc(b.cover)}">` : `<div class="mini-cover flex items-center justify-center" style="font-weight:700;color:var(--primary);">${esc(b.kode)}</div>`}
            <div class="info" style="cursor:pointer;" data-open="${b.id}">
              <b>${esc(b.judul)}</b>
              <span>${esc(b.penulis)}</span>
              <span style="display:block;">📥 Pinjam ${fmtDate(l.loan_date)} • 📅 Jatuh tempo <b>${fmtDate(l.due_date)}</b></span>
            </div>
            <div style="text-align:right;">
              <span class="badge badge-${info.type}">${esc(info.label)}</span>
              <div class="muted text-xs" style="margin-top:4px;">Kode ${esc(l.loan_code)}</div>
            </div>
          </div>`;
        }).join("") : A.emptyState("assets/student-reading.svg", "Belum ada pinjaman aktif", "Jelajahi katalog dan pinjam buku pertama kamu!", `<button class="btn btn-sm" onclick="window.__NAV__.katalog()">${ICONS.book} Jelajahi Buku</button>`)}
      </div>

      <div class="section text-sm muted">
        <b class="bold" style="color:var(--text);">Catatan:</b> Untuk mengembalikan buku, bawa ke meja perpustakaan dan pustakawan akan memverifikasi pengembalianmu.
      </div>`;

    render(html);
  }

  /* ================= RIWAYAT ================= */
  function renderRiwayat() {
    const std = currentStudent();
    const all = studentLoans(std.id).slice().sort((a, b) => new Date(b.loan_date) - new Date(a.loan_date));

    const html = `
      <div class="page-head">
        <h1>Riwayat Peminjaman</h1>
        <p>Seluruh catatan peminjaman dan pengembalian yang pernah kamu lakukan.</p>
      </div>

      ${all.length ? `
      <div class="table-wrap">
        <table class="table table-cards">
          <thead><tr>
            <th>Kode</th><th>Buku</th><th>Tanggal Pinjam</th><th>Jatuh Tempo</th><th>Dikembalikan</th><th>Status</th>
          </tr></thead>
          <tbody>
            ${all.map(l => {
              const b = bookById(l.book_id);
              const info = loanStatusInfo(l);
              const overdueFlag = (l.status === "returned" && l.return_date && new Date(l.due_date).getTime() < new Date(l.return_date).getTime());
              return `<tr>
                <td data-label="Kode" class="text-xs">${esc(l.loan_code)}</td>
                <td data-label="Buku"><div class="td-title">${esc(b ? b.judul : "-")}</div><div class="sub">${esc(b ? b.penulis : "")}</div></td>
                <td data-label="Tanggal Pinjam">${fmtDate(l.loan_date)}</td>
                <td data-label="Jatuh Tempo">${fmtDate(l.due_date)}</td>
                <td data-label="Dikembalikan">${l.return_date ? fmtDate(l.return_date) : "-"}</td>
                <td data-label="Status">${overdueFlag ? '<span class="badge badge-danger">Terlambat</span>' : A.loanBadge(l)}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>` : A.emptyState("assets/student-female.svg", "Belum ada riwayat", "Semua peminjaman & pengembalianmu akan tercatat di sini.")}`;

    render(html);
  }

  /* ================= FAVORIT ================= */
  function renderFavorit() {
    const std = currentStudent();
    const favIds = db().favorites.filter(f => f.student_id === std.id).map(f => f.book_id);
    const books = db().books.filter(b => favIds.includes(b.id));

    const html = `
      <div class="page-head">
        <h1>Buku Favorit</h1>
        <p>Kumpulan buku yang kamu simpan untuk dibaca nanti.</p>
      </div>
      ${books.length ? `<div class="book-grid">${books.map(b => A.bookCardHtml(b)).join("")}</div>` : A.emptyState("🤍", "Belum ada favorit", "Tekan ikon hati pada kartu buku untuk menyimpannya di sini.")}`;

    render(html);
  }

  /* ================= NOTIFIKASI ================= */
  function renderNotifikasi() {
    const std = currentStudent();
    const dbn = db();
    const notifs = dbn.notifications.filter(n => n.student_id === std.id).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const unread = notifs.filter(n => !n.is_read).length;
    const announcements = (dbn.settings.announcements || []).slice().reverse();

    const ai = { due: "⏰", late: "🚨", system: "💬", news: "📢", info: "💡" };

    const html = `
      <div class="page-head flex justify-between items-center flex-wrap gap-8">
        <div><h1>Notifikasi</h1><p>${unread} notifikasi belum dibaca.</p></div>
        ${notifs.length ? `<button class="btn btn-outline btn-sm" id="markAll">Tandai semua dibaca</button>` : ""}
      </div>

      ${announcements.map(a => `
        <div class="announce-banner">
          <span style="font-size:18px;">📢</span>
          <div><b>${esc(a.title)}</b><p>${esc(a.message)}</p><div class="time muted text-xs" style="margin-top:4px;">${timeAgo(a.created_at)}</div></div>
        </div>`).join("")}

      ${notifs.length ? notifs.map(n => `
        <div class="notif-item ${n.is_read ? "" : "unread"}" data-nid="${n.id}">
          <div class="notif-icon">${ai[n.type] || ai.info}</div>
          <div class="notif-body">
            <b>${esc(n.title)}</b>
            <p>${esc(n.message)}</p>
            <div class="time">${timeAgo(n.created_at)}</div>
          </div>
          ${n.is_read ? '<span class="muted text-xs">Sudah dibaca</span>' : '<span class="badge badge-primary">Baru</span>'}
        </div>`).join("") : A.emptyState("🔔", "Tidak ada notifikasi", "Pengingat jatuh tempo dan pengumuman akan muncul di sini.")}`;

    render(html);
    document.querySelectorAll(".notif-item[data-nid]").forEach(el => {
      el.onclick = () => {
        const n = dbn.notifications.find(x => x.id === el.dataset.nid);
        if (n && !n.is_read) { n.is_read = true; saveDB(dbn); A.refreshNotifBadges(); renderNotifikasi(); }
      };
    });
    const ma = document.getElementById("markAll");
    if (ma) ma.onclick = () => { dbn.notifications.forEach(n => { if (n.student_id === std.id) n.is_read = true; }); saveDB(dbn); A.refreshNotifBadges(); renderNotifikasi(); };
  }

  /* ================= PROFIL ================= */
  function renderProfil() {
    const std = currentStudent();
    const s = session();
    const dbx = db();
    const settings = dbx.settings || {};
    const ini = (std.nama || "U").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    const active = activeLoans(std.id);
    const all = studentLoans(std.id);
    const returned = all.filter(l => l.status === "returned").length;

    const html = `
      <div class="page-head">
        <h1>Profil Saya</h1>
        <p>Data diri, foto profil, dan keamanan akunmu.</p>
      </div>

      <div class="card mb-16">
        <div class="profile-head">
          <div class="profile-edit-avatar">
            <div class="profile-avatar" id="profileAvatar" style="${std.foto ? `background-image:url('${esc(std.foto)}');background-size:cover;background-position:center;` : ""}">${std.foto ? "" : ini}</div>
            <label class="profile-avatar-camera" for="profilePhotoInput" title="Ubah foto profil">${CAMERA_ICON}</label>
            <input type="file" id="profilePhotoInput" accept="image/png,image/jpeg,image/webp,image/gif" hidden>
          </div>
          <div style="flex:1;min-width:200px;">
            <h2 style="font-size:20px;font-weight:800;">${esc(std.nama)}</h2>
            <div class="muted text-sm">NIS <b>${esc(std.nis)}</b> • Kelas <b>${esc(std.kelas)} ${esc(std.jurusan)}</b></div>
            <div class="mt-8 flex gap-8" style="align-items:center;">
              <span class="badge badge-success">Aktif</span>
              ${std.foto ? `<button type="button" class="btn btn-outline btn-sm" id="btnHapusFoto" style="padding:4px 12px;font-size:12px;">Hapus Foto</button>` : ""}
            </div>
          </div>
          <div class="flex gap-12">
            <button class="btn btn-outline btn-sm" style="background:var(--danger);color:#fff;border-color:var(--danger);" id="btnLogout">${ICONS.logout} Keluar</button>
          </div>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card"><div class="stat-icon blue">${ICONS.loan}</div><div><div class="stat-info"><div class="num">${active.length}</div><div class="lbl">Pinjaman Aktif</div></div></div></div>
        <div class="stat-card"><div class="stat-icon green">${ICONS.history}</div><div><div class="stat-info"><div class="num">${returned}</div><div class="lbl">Buku Selesai Dibaca</div></div></div></div>
        <div class="stat-card"><div class="stat-icon yellow">${ICONS.favorite}</div><div><div class="stat-info"><div class="num">${dbx.favorites.filter(f => f.student_id === std.id).length}</div><div class="lbl">Favorit</div></div></div></div>
        <div class="stat-card"><div class="stat-icon red">${ICONS.alert}</div><div><div class="stat-info"><div class="num">${all.filter(l => l.status === "overdue").length}</div><div class="lbl">Pernah Terlambat</div></div></div></div>
      </div>

      <div class="grid" id="profGrid" style="grid-template-columns:1.1fr 1fr;gap:20px;">
        <div class="card">
          <h3 style="font-size:16px;font-weight:700;margin-bottom:16px;">Data Akun</h3>
          <div class="meta-row"><b>Nama Lengkap</b><span>${esc(std.nama)}</span></div>
          <div class="meta-row"><b>NIS / NISN</b><span>${esc(std.nis)}</span></div>
          <div class="meta-row"><b>Kelas</b><span>${esc(std.kelas)}</span></div>
          <div class="meta-row"><b>Jurusan</b><span>${esc(std.jurusan)}</span></div>
          <div class="meta-row"><b>Email</b><span>${esc(std.email || "-")}</span></div>
          <div class="meta-row"><b>Kontak</b><span>${esc(std.kontak || "-")}</span></div>
          <div class="meta-row"><b>Terakhir Login</b><span>${s.login_at ? fmtDateLong(s.login_at) : "-"}</span></div>
          <div class="meta-row"><b>Jam Layanan</b><span>${esc(settings.library_hours || "-")}</span></div>
        </div>

        <div class="card">
          <h3 style="font-size:16px;font-weight:700;margin-bottom:16px;">Ubah Kata Sandi</h3>
          <form id="changePasswordForm" novalidate>
            <div class="field"><label>Password lama</label><input class="input" id="oldPassword" type="password" placeholder="Password yang sedang dipakai" autocomplete="current-password"></div>
            <div class="field"><label>Password baru</label><input class="input" id="newPassword" type="password" placeholder="Minimal 6 karakter" autocomplete="new-password"></div>
            <div class="field"><label>Konfirmasi password baru</label><input class="input" id="confirmPassword" type="password" placeholder="Ulangi password baru" autocomplete="new-password"></div>
            <button type="submit" class="btn btn-sm mt-8">${ICONS.lock} Simpan Password</button>
          </form>
        </div>
      </div>`;

    render(html);
    if (window.innerWidth <= 900) { const g = document.getElementById("profGrid"); if (g) g.style.gridTemplateColumns = "1fr"; }
    const lg = document.getElementById("btnLogout");
    if (lg) lg.onclick = logout;

    let fileInput = document.getElementById("profilePhotoInput");
    if (fileInput) fileInput.onchange = function () {
      const file = this.files && this.files[0];
      if (!file) return;
      if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return A.toast("warning", "Format tidak didukung", "Pilih file gambar (PNG/JPG/WEBP).");
      if (file.size > 2 * 1024 * 1024) return A.toast("warning", "File terlalu besar", "Ukuran maksimal 2 MB.");
      compressPhoto(file, (dataUrl) => {
        const dbx2 = db();
        const idx = dbx2.students.findIndex(x => x.id === std.id);
        if (idx > -1) dbx2.students[idx].foto = dataUrl;
        saveDB(dbx2);
        A.toast("success", "Foto profil diperbarui");
        renderProfil();
      });
    };

    const del = document.getElementById("btnHapusFoto");
    if (del) del.onclick = () => {
      const dbx2 = db();
      const idx = dbx2.students.findIndex(x => x.id === std.id);
      if (idx > -1) dbx2.students[idx].foto = "";
      saveDB(dbx2);
      A.toast("info", "Foto profil dihapus");
      renderProfil();
    };

    const form = document.getElementById("changePasswordForm");
    if (form) form.onsubmit = (e) => {
      e.preventDefault();
      const oldPassword = document.getElementById("oldPassword").value;
      const newPassword = document.getElementById("newPassword").value;
      const confirmPassword = document.getElementById("confirmPassword").value;
      const dbx2 = db();
      const user = dbx2.users.find(u => u.id === session().user_id);
      if (!user || user.password !== oldPassword) return A.toast("error", "Password lama salah", "Masukkan password yang sedang digunakan.");
      if (newPassword.length < 6) return A.toast("warning", "Password terlalu pendek", "Gunakan minimal 6 karakter.");
      if (newPassword !== confirmPassword) return A.toast("error", "Konfirmasi tidak cocok", "Ulangi password baru dengan benar.");
      user.password = newPassword;
      saveDB(dbx2);
      form.reset();
      A.toast("success", "Password diperbarui", "Password baru sudah tersimpan.");
    };
  }

  function compressPhoto(file, done) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 320;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          const r = Math.min(MAX / w, MAX / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const type = file.type === "image/png" ? "image/png" : "image/jpeg";
        done(canvas.toDataURL(type, 0.82));
      };
      img.onerror = () => A.toast("error", "Gagal membaca gambar", "Coba pilih file gambar lain.");
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* ================= BANTUAN ================= */
  function renderBantuan() {
    const faqs = [
      ["Bagaimana cara mencari buku?", "Gunakan kolom pencarian di halaman Katalog. Kamu bisa mencari berdasarkan judul, penulis, ISBN, atau kata kunci. Gunakan filter untuk mempersempit hasil."],
      ["Bagaimana cara meminjam buku?", "Buka detail buku yang ingin dipinjam, lalu tekan tombol 'Pinjam Buku'. Pustakawan akan menyetujui peminjaman dan buku akan tercatat di 'Pinjaman Saya'."],
      ["Berapa lama masa peminjaman?", `Masa pinjam adalah <b>${db().settings.loan_duration || 7} hari</b>. Pastikan mengembalikan buku sebelum jatuh tempo.`],
      ["Berapa batas jumlah buku yang bisa dipinjam?", `Kamu bisa meminjam maksimal <b>${db().settings.loan_limit || 3} buku</b> dalam satu waktu.`],
      ["Bagaimana cara mengembalikan buku?", "Bawa buku ke meja perpustakaan. Pustakawan akan memverifikasi kondisi buku dan mencatat pengembalianmu."],
      ["Terlambat mengembalikan buku?", "Kamu akan mendapat notifikasi pengingat. Segera kembalikan buku dan hubungi pustakawan untuk konfirmasi."],
      ["Bagaimana tahu buku tersedia atau tidak?", "Setiap kartu buku menampilkan badge status: hijau (tersedia), kuning (stok terbatas), merah (dipinjam semua)."]
    ];
    const rules = [
      "Kartu keanggotaan / akun SIPUS harus aktif untuk meminjam.",
      `Maksimal ${db().settings.loan_limit || 3} buku selama ${db().settings.loan_duration || 7} hari.`,
      "Buku yang dikembalikan terlambat akan dikenakan perpanjangan waktu atau sanksi sesuai aturan sekolah.",
      "Jaga buku agar tidak rusak, coretan, atau sobek. Buku rusak menjadi tanggung jawab peminjam.",
      "Dilarang meminjamkan buku ke siswa lain atas nama akun milikmu.",
      `Jam layanan: ${esc(db().settings.library_hours || "-")}`
    ];

    const html = `
      <div class="page-head">
        <h1>Pusat Bantuan</h1>
        <p>Pertanyaan yang sering diajukan dan aturan perpustakaan.</p>
      </div>

      <div class="section">
        <div class="section-head"><h3>FAQ</h3></div>
        ${faqs.map((f, i) => `
          <div class="faq-item">
            <button class="faq-q" data-faq="${i}"><span>${i + 1}. ${esc(f[0])}</span><span class="chev">▾</span></button>
            <div class="faq-a">${f[1]}</div>
          </div>`).join("")}
      </div>

      <div class="section">
        <div class="section-head"><h3>Tata Tertib Perpustakaan</h3></div>
        <div class="card">
          <ul style="list-style:none;display:grid;gap:10px;font-size:14px;">
            ${rules.map(r => `<li style="display:flex;gap:10px;"><span style="color:var(--primary);font-weight:700;">•</span><span>${r}</span></li>`).join("")}
          </ul>
        </div>
      </div>`;

    render(html);
    document.querySelectorAll(".faq-q").forEach(q => q.onclick = () => q.parentElement.classList.toggle("open"));
  }

  /* ================= AKSI: FAVORIT & PINJAM ================= */
  function toggleFav(el) {
    const bId = el.dataset.fav;
    const std = currentStudent();
    if (!std) { A.toast("warning", "Login dulu", "Login untuk menyimpan favorit."); return; }
    const dbx = db();
    const existing = dbx.favorites.find(f => f.student_id === std.id && f.book_id === bId);
    if (existing) {
      dbx.favorites = dbx.favorites.filter(f => f.id !== existing.id);
      saveDB(dbx);
      A.toast("info", "Dihapus dari favorit");
    } else {
      dbx.favorites.push({ id: uid("fav-"), student_id: std.id, book_id: bId, created_at: new Date().toISOString() });
      saveDB(dbx);
      A.toast("success", "Ditambahkan ke favorit", "Buku tersimpan untuk dibaca nanti.");
    }
    // re-render current view preserving detail state
    const fn = window.__NAV__[state.view];
    if (state.view === "detail") { renderDetail(); } else if (fn) { fn(); }
  }

  function borrowBook(bId) {
    const std = currentStudent();
    const b = bookById(bId);
    if (!std) { A.toast("warning", "Login dulu", "Kamu harus login untuk meminjam buku."); return; }
    if (!b) return;

    const dbx = db();
    const limit = dbx.settings.loan_limit || 3;
    const duration = dbx.settings.loan_duration || 7;
    const active = activeLoans(std.id);
    const already = active.some(l => l.book_id === bId);

    if (b.available <= 0) { A.toast("error", "Tidak tersedia", "Semua eksemplar sedang dipinjam."); return; }
    if (active.length >= limit) { A.toast("error", "Batas pinjam tercapai", `Kamu sudah meminjam ${active.length}/${limit} buku.`); return; }
    if (already) { A.toast("warning", "Sudah dipinjam", "Kamu sedang meminjam buku ini."); return; }

    const toIn = (d) => {
      const p = n => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    };
    const today = new Date();
    const start = new Date();
    const due = new Date(); due.setDate(due.getDate() + duration);
    const minEnd = new Date(start); minEnd.setDate(minEnd.getDate() + 1);

    const cover = b.cover
      ? `<img class="bb-cover" src="${esc(b.cover)}" alt="">`
      : `<div class="bb-cover bb-cover-empty"><b>${esc(b.kode)}</b></div>`;

    const html = `
      <div class="bb">
        <div class="bb-book">
          <div class="bb-cover" style="flex:0 0 104px;">${cover}</div>
          <div class="bb-meta">
            <b>${esc(b.judul)}</b>
            <span>${esc(b.penulis)}</span>
            <span class="bb-cat">${esc(categoryName(b.kategori_id))} • ${esc(b.tahun)}</span>
            <div class="bb-tags">
              <span class="badge badge-success">${b.available > 0 ? `Tersedia ${b.available}` : "Habis"}</span>
              <span class="badge badge-neutral">Kuota ${active.length}/${limit}</span>
            </div>
          </div>
        </div>
        <div class="bb-label">📅 Atur Jadwal Pinjam</div>
        <div class="bb-dates">
          <div class="bb-field">
            <label>Tanggal Pinjam</label>
            <input class="input" type="date" id="bbStart" value="${toIn(start)}" min="${toIn(today)}">
          </div>
          <div class="bb-field">
            <label>Tanggal Kembali</label>
            <input class="input" type="date" id="bbEnd" value="${toIn(due)}" min="${toIn(minEnd)}" max="${toIn(due)}">
          </div>
        </div>
        <div class="bb-sum"></div>
        <div class="bb-actions">
          <button class="btn btn-outline btn-sm" type="button" id="bbCancel">Batal</button>
          <button class="btn btn-accent btn-sm" type="button" id="bbGo">Ajukan Pinjam</button>
        </div>
      </div>`;

    A.openModal("Ajukan Peminjaman", html, {
      onOpen: (ov) => {
        const stIn = ov.querySelector("#bbStart");
        const enIn = ov.querySelector("#bbEnd");
        const sumEl = ov.querySelector(".bb-sum");
        const build = () => {
          const st = new Date(stIn.value);
          const en = new Date(enIn.value);
          const ok = en > st;
          const days = ok ? Math.round((en - st) / 86400000) : 0;
          const over = ok && days > duration;
          sumEl.innerHTML = `
            <div class="bb-row"><b>Durasi Pinjam</b><span>${ok ? `${days} hari` : "—"}</span></div>
            <div class="bb-row"><b>Jatuh Tempo</b><span>${ok ? fmtDate(en.toISOString()) : "Pilih tanggal kembali"}</span></div>
            <div class="bb-row bb-row-muted"><b>Maksimal</b><span>${duration} hari</span></div>
            ${over ? `<div class="bb-error">Maksimal ${duration} hari dari tanggal pinjam.</div>` : ""}
            <div class="bb-row bb-row-muted"><b>Kuota Aktif</b><span>${active.length}/${limit} buku</span></div>`;
          return ok && !over;
        };
        stIn.onchange = () => {
          const st = new Date(stIn.value);
          const mn = new Date(st); mn.setDate(st.getDate() + 1);
          const mx = new Date(st); mx.setDate(st.getDate() + duration);
          enIn.min = toIn(mn);
          enIn.max = toIn(mx);
          if (!enIn.value || new Date(enIn.value) <= st || new Date(enIn.value) > mx) enIn.value = toIn(mx);
          build();
        };
        enIn.onchange = build;
        const go = ov.querySelector("#bbGo") || ov.querySelector(".modal-ft .btn-accent") || ov.querySelector(".modal-actions .btn-accent");
        if (go) {
          build();
          go.onclick = () => {
            if (!build()) { A.toast("error", "Durasi tidak valid", `Tanggal kembali maksimal ${duration} hari dari tanggal pinjam.`); return; }
            const st = new Date(stIn.value), en = new Date(enIn.value);
            dbx.loans.push({
              id: uid("loan-"), loan_code: "PJM-" + String(1000 + dbx.loans.length + 1),
              student_id: std.id, book_id: bId,
              loan_date: st.toISOString(), due_date: en.toISOString(), return_date: null,
              status: "requested", condition_out: b.kondisi || "Baik", processed_by: null, note: ""
            });
            dbx.notifications.push({
              id: uid("ntf-"), student_id: std.id, type: "info", title: "Permintaan pinjaman dikirim",
              message: `Permintaan pinjam "${b.judul}" menunggu persetujuan pustakawan.`,
              is_read: false, created_at: new Date().toISOString()
            });
            saveDB(dbx);
            A.toast("success", "Permintaan dikirim!", "Menunggu persetujuan pustakawan.");
            setTimeout(() => { state.view = "pinjaman"; state.bookId = null; renderLayout(); renderPinjaman(); }, 900);
          };
        }
      }
    });
  }

  /* ================= PINJAM CEPAT (hero fast-action) ================= */
  function quickBorrow() {
    const std = currentStudent();
    if (!std) { A.toast("warning", "Login dulu", "Kamu harus login untuk meminjam buku."); return; }
    const dbx = db();
    const limit = dbx.settings.loan_limit || 3;
    const duration = dbx.settings.loan_duration || 7;
    const latest = () => { const d = new Date(); d.setDate(d.getDate() + duration); return d; };
    const active = activeLoans(std.id);
    const already = new Set(active.map(l => l.book_id));
    const available = dbx.books
      .filter(b => b.available > 0 && !already.has(b.id))
      .sort((a, b) => (b.available - a.available) || (b.tahun - a.tahun))
      .slice(0, 8);

    if (!available.length) { A.toast("info", "Tidak ada buku tersedia", "Semua buku sedang dipinjam. Coba lagi nanti."); return; }

    const html = `
      <div class="qb">
        <p class="qb-hint">Pilih buku yang ingin kamu pakai langsung dengan tanggal pinjam hari ini:</p>
        <div class="qb-grid">
          ${available.map(b => `
            <div class="qb-card" data-bid="${esc(b.id)}">
              <div class="qb-cover">${b.cover ? `<img src="${esc(b.cover)}" alt="" loading="lazy">` : `<span class="qb-cover-empty">${esc(b.kode)}</span>`}</div>
              <div class="qb-info">
                <b>${esc(b.judul)}</b>
                <span>${esc(b.penulis)}</span>
                <span class="qb-avail">${b.available} tersedia</span>
              </div>
            </div>`).join("")}
        </div>
        <div class="bb-dates">
          <div class="bb-field">
            <label>Tanggal Pinjam</label>
            <input class="input" type="date" id="qbStart" value="${toIn(start())}" min="${toIn(start())}">
          </div>
          <div class="bb-field">
            <label>Tanggal Kembali</label>
            <input class="input" type="date" id="qbEnd" value="${toIn(latest())}" min="${toIn(minEnd())}" max="${toIn(latest())}">
          </div>
        </div>
        <div class="qb-sum"></div>
        <div class="bb-actions">
          <button class="btn btn-outline btn-sm" type="button" id="bbCancel">Batal</button>
          <button class="btn btn-accent btn-sm" type="button" id="bbOk" disabled>Ajukan Pinjam</button>
        </div>
      </div>`;

    A.openModal("Pinjam Cepat", html, {
      onOpen: (ov) => {
        const stIn = ov.querySelector("#qbStart");
        const enIn = ov.querySelector("#qbEnd");
        const sumEl = ov.querySelector(".qb-sum");
        const okBtn = ov.querySelector("#bbOk");
        const cancelBtn = ov.querySelector("#bbCancel");
        let selId = null;
        const build = () => {
          const b = selId ? bookById(selId) : null;
          const st = new Date(stIn.value), en = new Date(enIn.value);
          const ok = b && en > st;
          const days = ok ? Math.round((en - st) / 86400000) : 0;
          const over = ok && days > duration;
          sumEl.innerHTML = `
            ${b ? `<div class="bb-row"><b>Buku</b><span>${esc(b.judul)}</span></div>` : `<div class="bb-row"><b>Buku</b><span>—</span></div>`}
            <div class="bb-row"><b>Durasi Pinjam</b><span>${days ? `${days} hari` : "—"}</span></div>
            <div class="bb-row bb-row-muted"><b>Maksimal</b><span>${duration} hari</span></div>
            ${over ? `<div class="bb-error">Maksimal ${duration} hari dari tanggal pinjam.</div>` : ""}
            <div class="bb-row"><b>Kuota Aktif</b><span>${active.length}/${limit} buku</span></div>`;
          okBtn.disabled = !ok || over;
          return ok && !over;
        };
        ov.querySelectorAll(".qb-card").forEach(card => {
          card.onclick = () => {
            ov.querySelectorAll(".qb-card").forEach(c => c.classList.toggle("sel", c === card));
            selId = card.dataset.bid;
            const b = bookById(selId);
            if (b && !stIn.value) { stIn.value = toIn(new Date()); enIn.value = toIn(minEnd()); }
            build();
          };
        });
        stIn.onchange = () => {
          const st = new Date(stIn.value);
          const mn = new Date(st); mn.setDate(st.getDate() + 1);
          const mx = new Date(st); mx.setDate(st.getDate() + duration);
          enIn.min = toIn(mn);
          enIn.max = toIn(mx);
          if (!enIn.value || new Date(enIn.value) <= st || new Date(enIn.value) > mx) enIn.value = toIn(mx);
          build();
        };
        enIn.onchange = build;
        cancelBtn.onclick = ov.close;
        okBtn.onclick = () => {
          if (!selId) { A.toast("warning", "Pilih buku dulu", "Pilih salah satu buku yang tersedia."); return; }
          if (!build()) { A.toast("warning", "Durasi tidak valid", `Tanggal kembali maksimal ${duration} hari dari tanggal pinjam.`); return; }
          const b = bookById(selId);
          const st = new Date(stIn.value), en = new Date(enIn.value);
          dbx.loans.push({
            id: uid("loan-"), loan_code: "PJM-" + String(1000 + dbx.loans.length + 1),
            student_id: std.id, book_id: selId,
            loan_date: st.toISOString(), due_date: en.toISOString(), return_date: null,
            status: "requested", condition_out: b.kondisi || "Baik", processed_by: null, note: ""
          });
          dbx.notifications.push({
            id: uid("ntf-"), student_id: std.id, type: "info", title: "Permintaan pinjaman dikirim",
            message: `Permintaan pinjam "${b.judul}" menunggu persetujuan pustakawan.`,
            is_read: false, created_at: new Date().toISOString()
          });
          saveDB(dbx);
          A.toast("success", "Permintaan dikirim!", "Menunggu persetujuan pustakawan.");
          setTimeout(() => { state.view = "pinjaman"; state.bookId = null; renderLayout(); renderPinjaman(); }, 900);
        };
      }
    });
  }

  const toIn = (d) => {
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  const start = () => new Date();
  const minEnd = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d; };

  /* ================= BOOT ================= */
  function boot() {
    if (!A.requireAuth()) return;
    const s = session();
    if (s.role !== "siswa") { location.href = "app-admin.html"; return; }
    S.syncOverdue(db());
    renderLayout();
    renderDashboard();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();