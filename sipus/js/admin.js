/* ============================================================
   SIPUS — Aplikasi Admin / Pustakawan (SPA)
   Fitur: Dashboard, Buku, Kategori, Stok, Siswa, Peminjaman,
          Pengembalian, Notifikasi, Laporan, Audit, Pengaturan
   Tema modern: body.admin-mode (lihat css/admin.css)
   ============================================================ */
(function () {
  const S = window.SIPUS;
  const A = window.APP;
  const { getDB, saveDB, ICONS, esc, fmtDate, fmtDateLong, timeAgo, bookById, categoryName, studentById, bookStatus, loanStatusInfo, uid, todayStr, SMA_JURUSAN } = S;

  let state = { view: "dashboard" };

  function db() { return getDB(); }
  function session() { return A.getSession(); }

  const NAV_ITEMS = [
    { label: "Utama", key: "dashboard", icon: "dashboard", text: "Dashboard" },
    { key: "peminjaman", icon: "loan", text: "Peminjaman" },
    { key: "pengembalian", icon: "return", text: "Pengembalian" },
    { label: "Data", key: "buku", icon: "book", text: "Data Buku" },
    { key: "kategori", icon: "grid", text: "Kategori" },
    { key: "stok", icon: "box", text: "Stok" },
    { key: "siswa", icon: "users", text: "Data Siswa" },
    { key: "guru", icon: "user", text: "Data Guru" },
    { label: "Kolaborasi", key: "usulanGuru", icon: "user", text: "Usulan Guru" },
    { label: "Pelaporan", key: "laporan", icon: "report", text: "Laporan" },
    { key: "notifikasi", icon: "bell", text: "Notifikasi" },
    { key: "audit", icon: "info", text: "Audit Aktivitas" }
  ];

  const TITLES = {
    dashboard: "Dashboard Admin", buku: "Data Buku", kategori: "Kategori",
    stok: "Manajemen Stok", siswa: "Data Siswa", guru: "Data Guru", peminjaman: "Peminjaman",
    pengembalian: "Pengembalian", laporan: "Laporan", notifikasi: "Notifikasi",
    audit: "Audit Aktivitas", usulanGuru: "Usulan Guru", pengaturan: "Pengaturan"
  };

  // ---- quick stats for badge counts
  function pendingCount() { return db().loans.filter(l => l.status === "requested").length; }
  function overdueCount() { return db().loans.filter(l => l.status === "overdue").length; }

  /* ---------- helpers visual ---------- */
  function coverThumb(b) {
    if (!b) return '<div class="bk-thumb bk-thumb-empty">-</div>';
    return b.cover
      ? `<img class="bk-thumb" src="${esc(b.cover)}" alt="">`
      : `<div class="bk-thumb bk-thumb-empty">${esc(b.kode)}</div>`;
  }
  function avatarMini(name) {
    const ini = String(name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    return `<div class="mini-avatar">${esc(ini)}</div>`;
  }
  function accentBar(color) { return `<span class="accent-bar" style="background:${color};"></span>`; }
  function statusPill(l) {
    const info = loanStatusInfo(l);
    const map = { active: "pill-active", overdue: "pill-overdue", requested: "pill-pending", approved: "pill-returned", returned: "pill-returned", rejected: "pill-rejected" };
    return `<span class="status-pill ${map[l.status] || "pill-neutral"}">${esc(info.label)}</span>`;
  }

  function renderLayout() {
    const s = session();
    const ur = A.notifBadgeFor(s);
    const navItems = NAV_ITEMS.map(it => ({ ...it, badge: it.key === "peminjaman" ? pendingCount() : it.key === "pengembalian" ? overdueCount() : it.key === "notifikasi" ? ur : 0 }));
    const sidebar = A.buildSidebar(navItems, state.view, s);
    const topbar = A.buildTopbar(TITLES[state.view] || "Admin", ur);
    A.setAppShell(`${sidebar}<main class="main">${topbar}<div class="content" id="content"></div></main>`);
    A.afterLayout({
      onNotif: () => go("notifikasi"),
      onNotifDropdown: (panel) => buildAdminNotifPanel(panel),
      profileMenu: [
        { key: "pengaturan", icon: "settings", text: "Pengaturan" },
        { key: "keluar", icon: "logout", text: "Keluar" }
      ]
    });
    A.startNotifSync();
  }

  function render(html) {
    document.getElementById("content").innerHTML = html;
  }

  function go(key) { if (window.__NAV__[key]) window.__NAV__[key](); }
  function scrollTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }

  function logAction(action, module, detail) {
    const dbx = db();
    const s = session();
    dbx.audit_logs.unshift({
      id: uid("au-"), user_id: s ? s.user_id : "guest", action, module, detail,
      created_at: new Date().toISOString()
    });
    saveDB(dbx);
  }

  function logout() {
    const adm = db().users.find(u => u.id === (A.getSession() || {}).user_id) || {};
    A.logoutDialog({
      name: adm.name,
      sub: "Sesi dashboard admin akan diakhiri dengan aman. Kamu bisa masuk kembali kapan saja.",
      onConfirm: () => { A.clearSession(); location.href = "login.html"; }
    });
  }

  window.__NAV__ = {
    dashboard: () => { state.view = "dashboard"; renderLayout(); renderDashboard(); scrollTop(); },
    buku: () => { state.view = "buku"; renderLayout(); renderBuku(); scrollTop(); },
    kategori: () => { state.view = "kategori"; renderLayout(); renderKategori(); scrollTop(); },
    stok: () => { state.view = "stok"; renderLayout(); renderStok(); scrollTop(); },
    siswa: () => { state.view = "siswa"; renderLayout(); renderSiswa(); scrollTop(); },
    guru: () => { state.view = "guru"; renderLayout(); renderGuru(); scrollTop(); },
    peminjaman: () => { state.view = "peminjaman"; renderLayout(); renderPeminjaman(); scrollTop(); },
    pengembalian: () => { state.view = "pengembalian"; renderLayout(); renderPengembalian(); scrollTop(); },
    laporan: () => { state.view = "laporan"; renderLayout(); renderLaporan(); scrollTop(); },
    notifikasi: () => { state.view = "notifikasi"; renderLayout(); renderNotifikasi(); scrollTop(); },
    audit: () => { state.view = "audit"; renderLayout(); renderAudit(); scrollTop(); },
    usulanGuru: () => { state.view = "usulanGuru"; renderLayout(); renderUsulanGuru(); scrollTop(); },
    pengaturan: () => { state.view = "pengaturan"; renderLayout(); renderPengaturan(); scrollTop(); },
    keluar: logout
  };

  /* ================= DASHBOARD ================= */
  function renderDashboard() {
    const dbx = db();
    const books = dbx.books;
    const loans = dbx.loans;
    const students = dbx.students;
    const activeStudents = dbx.users.filter(u => u.role === "siswa" && u.status === "Aktif").length;

    const totalBooks = books.reduce((a, b) => a + b.total, 0);
    const availableBooks = books.reduce((a, b) => a + b.available, 0);
    const borrowed = books.reduce((a, b) => a + b.borrowed, 0);
    const overdue = loans.filter(l => l.status === "overdue").length;
    const activeLoans = loans.filter(l => ["active", "overdue"].includes(l.status)).length;
    const pending = loans.filter(l => l.status === "requested").length;
    const lowStock = books.filter(b => b.available <= 2 && b.available > 0).length;
    const outStock = books.filter(b => b.available === 0).length;

    const today = todayStr();
    const todayActivity = loans.filter(l => (l.loan_date || "").slice(0, 10) === today || (l.return_date || "").slice(0, 10) === today).length;

    const overdue_list = loans.filter(l => l.status === "overdue").slice().sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 5);
    const usulan_list = (dbx.book_requests || []).filter(p => p.status === "pending").slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);
    const assignments = (dbx.settings && dbx.settings.announcements || []).slice().reverse();
    const chart = chartHtml("7H");

    const token = (renderDashboard.__t = (renderDashboard.__t || 0) + 1);
    render(skeletonAdmin());
    setTimeout(() => {
      if (renderDashboard.__t !== token) return;
      try { render(realHtml()); bindDashboard(); }
      catch (err) { render(errorPanel(err)); }
    }, 280);

    function realHtml() {
      const hariNama = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      return `
      <div class="hero">
        <div>
          <span class="hero-kicker">${ICONS.sparkle} Panel Pustakawan</span>
          <h2>Kelola Perpustakaan dengan Lebih Baik</h2>
          <p>${esc(hariNama)} • Pantau <b>${totalBooks} eksemplar</b>, <b>${activeLoans} pinjaman aktif</b>, dan <b>${students.length} siswa</b> dalam satu pandangan.</p>
          <div class="hero-cta no-print">
            <button class="btn btn-accent" onclick="window.__NAV__.buku();">${ICONS.plus} Tambah Buku</button>
            <button class="btn btn-glass btn-sm" onclick="window.__NAV__.peminjaman();">${ICONS.loan} Data Peminjaman</button>
            ${pending ? `<button class="btn btn-glass btn-sm" onclick="window.__NAV__.peminjaman();">${pending} Menunggu</button>` : ""}
          </div>
        </div>
        <img class="hero-art" src="assets/hero-admin.svg" alt="Ilustrasi pengelolaan perpustakaan">
      </div>

      <div class="alert-strip">
        <button class="alert-block danger" onclick="window.__NAV__.pengembalian();">
          <span class="ab-icon">${ICONS.alert}</span>
          <span class="ab-info"><b>${overdue}</b><span>Peminjaman terlambat</span></span>
          <span class="link-arrow">Tindak →</span>
        </button>
        <button class="alert-block warn" onclick="window.__NAV__.peminjaman();">
          <span class="ab-icon">${ICONS.loan}</span>
          <span class="ab-info"><b>${pending}</b><span>Menunggu persetujuan</span></span>
          <span class="link-arrow">Proses →</span>
        </button>
        <button class="alert-block info" onclick="window.__NAV__.stok();">
          <span class="ab-icon">${ICONS.box}</span>
          <span class="ab-info"><b>${lowStock}</b><span>Stok menipis${outStock ? ` • ${outStock} habis` : ""}</span></span>
          <span class="link-arrow">Kelola →</span>
        </button>
      </div>

      <div class="dash-stats">
        ${statCard("blue", ICONS.book, totalBooks, "Total Eksemplar", `${books.length} judul terdaftar`)}
        ${statCard("green", ICONS.box, availableBooks, "Tersedia", `${Math.round(availableBooks / Math.max(1, totalBooks) * 100)}% dari koleksi`)}
        ${statCard("orange", ICONS.loan, activeLoans, "Sedang Dipinjam", `${borrowed} eksemplar keluar`)}
        ${statCard("yellow", ICONS.users, activeStudents, "Siswa Aktif", `${students.length} anggota terdaftar`)}

        <div class="chart-card" style="grid-column:1 / -1;" id="chartCard">
          <div class="chart-head">
            <div>
              <h3>Tren Peminjaman & Pengembalian</h3>
              <div class="chart-legend">
                <span><i style="background:var(--primary);"></i>Peminjaman</span>
                <span><i style="background:var(--success);"></i>Pengembalian</span>
                <span>Total aktivitas hari ini: <b>${todayActivity}</b></span>
              </div>
            </div>
            <div class="chart-toggle" id="chartToggle">
              <button data-r="7H">7H</button>
              <button data-r="30H">30H</button>
              <button data-r="3B">3B</button>
            </div>
          </div>
          <div id="chartBody">${chart}</div>
        </div>
      </div>

      <div class="dash-grid-2">
        <div class="dash-section">
          <div class="section-head"><h3>Aktivitas Terbaru</h3><a class="link-arrow" onclick="window.__NAV__.audit();">Semua aktivitas →</a></div>
          <ul class="timeline">
            ${(dbx.audit_logs || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6).map(a => `
              <li class="timeline-item info">
                <span class="timeline-dot">${ICONS.settings}</span>
                <div class="timeline-body"><b>${esc(a.action)} — ${esc(a.module)}</b><p>${esc(a.detail)}</p><div class="time">${timeAgo(a.created_at)}</div></div>
              </li>`).join("") || A.emptyState("🗂️", "Belum ada aktivitas")}
          </ul>
        </div>
        <div class="dash-section">
          <div class="section-head"><h3>Menu Cepat</h3></div>
          <div class="quick-menu two">
            <button class="quick-menu-item" onclick="window.__NAV__.buku();">${ICONS.book}<span>Data Buku</span></button>
            <button class="quick-menu-item" onclick="window.__NAV__.kategori();">${ICONS.grid}<span>Kategori</span></button>
            <button class="quick-menu-item" onclick="window.__NAV__.siswa();">${ICONS.users}<span>Data Siswa</span></button>
            <button class="quick-menu-item" onclick="window.__NAV__.laporan();">${ICONS.report}<span>Laporan</span></button>
          </div>
          ${assignments.length ? `
          <div class="section-head" style="margin-top:20px;"><h3>Pengumuman</h3></div>
          ${assignments.slice(0, 2).map(a => `<div class="announce-banner" style="margin-bottom:10px;"><span style="font-size:18px;">📢</span><div><b>${esc(a.title)}</b><p>${esc(a.message)}</p></div></div>`).join("")}` : ""}
        </div>
      </div>

      <div class="dash-grid-2">
        <div class="dash-section">
          <div class="section-head"><h3>Ringkasan Koleksi</h3><a class="link-arrow" onclick="window.__NAV__.kategori();">Kelola kategori →</a></div>
          ${(() => {
            const cats = dbx.categories.map(c => ({ name: c.name, total: books.filter(b => b.kategori_id === c.id).reduce((a, b) => a + b.total, 0) }));
            const mx = Math.max(1, ...cats.map(c => c.total));
            if (!cats.length) return A.emptyState("🗂️", "Belum ada kategori");
            return cats.map(c => `<div class="ringkasan-row">
              <span class="rl" title="${esc(c.name)}">${esc(c.name)}</span>
              <span class="rt"><span class="rf" style="width:${Math.round(c.total / mx * 100)}%;"></span></span>
              <span class="rv">${c.total}</span>
            </div>`).join("");
          })()}
        </div>
        <div class="dash-section">
          <div class="section-head"><h3>Perlu Perhatian</h3>${overdue ? `<span class="status-pill pill-overdue">${overdue}</span>` : ""}</div>
          ${overdue_list.length ? overdue_list.map(l => {
            const b = bookById(l.book_id); const std = studentById(l.student_id);
            const days = Math.max(1, Math.ceil((Date.now() - new Date(l.due_date).getTime()) / 86400000));
            return `
            <div class="loan-item">
              ${b && b.cover ? `<img class="mini-cover" src="${esc(b.cover)}" alt="">` : `<div class="mini-cover no-cover-md">${esc(b ? b.kode : "")}</div>`}
              <div class="info"><b>${esc(b ? b.judul : "-")}</b><span>${esc(std ? std.nama : "-")} • terlambat ${days} hari</span></div>
              <button class="btn btn-outline btn-sm" onclick="window.__NAV__.pengembalian();">Proses</button>
            </div>`;
          }).join("") : A.emptyState("🎉", "Tidak ada keterlambatan", "Semua buku kembali tepat waktu.")}
        </div>
      </div>

      ${usulan_list.length ? `
      <div class="dash-section" style="margin-top:0;">
        <div class="section-head"><h3>Usulan Buku dari Guru</h3><a class="link-arrow" onclick="window.__NAV__.usulanGuru();">Kelola usulan →</a></div>
        ${usulan_list.map(p => `<div class="loan-item">
          <div class="info" style="flex:1;"><b>${esc(p.title)}</b><span>Diajukan oleh ${esc(p.teacher_name || "Guru")} • ${timeAgo(p.created_at)}</span></div>
          <button class="btn btn-sm" onclick="window.__NAV__.usulanGuru();">Tinjau</button>
        </div>`).join("")}
      </div>` : ""}`;
    }

    function bindDashboard() {
      document.querySelectorAll("#chartToggle button").forEach(bn => {
        bn.classList.toggle("active", bn.dataset.r === "7H");
        bn.onclick = () => {
          document.querySelectorAll("#chartToggle button").forEach(x => x.classList.remove("active"));
          bn.classList.add("active");
          const body = document.getElementById("chartBody");
          if (body) body.innerHTML = chartHtml(bn.dataset.r);
          bindChartTip();
        };
      });
      bindChartTip();
      if (window.innerWidth <= 980) {
        document.querySelectorAll(".dash-grid-2").forEach(g => g.classList.add("single-col"));
      }
    }

    function chartHtml(range) {
      try {
        const days = range === "7H" ? 7 : range === "30H" ? 30 : 90;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const since = today.getTime() - (days - 1) * 86400000;
        const rows = [];
        for (let i = 0; i < days; i++) {
          const d = new Date(since + i * 86400000);
          rows.push({ d, loan: 0, ret: 0 });
        }
        const idx = dateStr => {
          const t = new Date(dateStr); t.setHours(0, 0, 0, 0);
          return Math.floor((t - since) / 86400000);
        };
        dbx.loans.forEach(l => {
          if (l.loan_date) { const i = idx(l.loan_date); if (i >= 0 && i < days) rows[i].loan++; }
          if (l.return_date) { const i = idx(l.return_date); if (i >= 0 && i < days) rows[i].ret++; }
        });
        const maxVal = Math.max(1, ...rows.map(r => Math.max(r.loan, r.ret)));
        const step = days >= 90 ? 10 : days >= 30 ? 4 : 1;
        const W = 100, H = 46, PAD = 6;
        const span = Math.max(1, days - 1);
        const plotH = H - PAD * 2;
        const xi = (i) => PAD + (i * (W - PAD * 2)) / span;
        const yv = (v) => PAD + (1 - v / maxVal) * plotH;
        const pts = (key) => rows.map((r, i) => [xi(i), yv(r[key])]);
        const dateShort = (d) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

        const smooth = (list) => {
          if (list.length < 2) return "";
          let d = `M ${list[0][0].toFixed(2)},${list[0][1].toFixed(2)}`;
          for (let i = 0; i < list.length - 1; i++) {
            const p0 = list[Math.max(0, i - 1)], p1 = list[i], p2 = list[i + 1], p3 = list[Math.min(list.length - 1, i + 2)];
            const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
            const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
            d += ` C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
          }
          return d;
        };
        const areaD = (list) => `M ${PAD.toFixed(2)},${(PAD + plotH).toFixed(2)} L ${list.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" L ")} L ${(W - PAD).toFixed(2)},${(PAD + plotH).toFixed(2)} Z`;
        const loanPts = pts("loan"), retPts = pts("ret");

        const hGrid = [0, .25, .5, .75, 1].map(f =>
          `<line class="grid-h" x1="${PAD}" y1="${yv(maxVal * f).toFixed(2)}" x2="${W - PAD}" y2="${yv(maxVal * f).toFixed(2)}"/>`).join("");
        const yLabels = [0, .25, .5, .75, 1].map(f =>
          `<span class="chart-ylabel" style="top:${(yv(maxVal * f) / H * 100).toFixed(2)}%;">${f === 0 ? 0 : Math.round(maxVal * f)}</span>`).join("");
        const vGrid = rows.map((r, i) => (i % step === 0
          ? `<line class="grid-v" x1="${xi(i).toFixed(2)}" y1="${PAD}" x2="${xi(i).toFixed(2)}" y2="${(PAD + plotH).toFixed(2)}"/>`
          : "")).join("");
        const last = rows.length - 1;
        const slices = rows.map((r, i) =>
          `<rect class="hover-slice" data-tx="${(xi(i) / W * 100).toFixed(2)}" data-date="${esc(dateShort(r.d))}" data-loan="${r.loan}" data-ret="${r.ret}" x="${(xi(i) - (W - PAD * 2) / span / 2).toFixed(2)}" y="0" width="${((W - PAD * 2) / span).toFixed(2)}" height="${H}"><title>${dateShort(r.d)} · Peminjaman ${r.loan} · Pengembalian ${r.ret}</title></rect>`).join("");
        const xlabels = rows.map((r, i) => i % step === 0 ? `<span>${r.d.getDate()}</span>` : `<span></span>`).join("");

        return `<div class="chart-box">
          <div class="chart-yaxis">${yLabels}</div>
          <div class="chart-line">
            <svg class="line-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Grafik tren peminjaman dan pengembalian">
              <defs>
                <linearGradient id="chartGradLoan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style="stop-color:var(--primary);stop-opacity:.34"/>
                  <stop offset="100%" style="stop-color:var(--primary);stop-opacity:0"/>
                </linearGradient>
                <linearGradient id="chartGradRet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style="stop-color:var(--success);stop-opacity:.3"/>
                  <stop offset="100%" style="stop-color:var(--success);stop-opacity:0"/>
                </linearGradient>
              </defs>
              ${vGrid}
              ${hGrid}
              <path class="area ret" d="${areaD(retPts)}" fill="url(#chartGradRet)"/>
              <path class="area loan" d="${areaD(loanPts)}" fill="url(#chartGradLoan)"/>
              <path class="line ret" d="${smooth(retPts)}"/>
              <path class="line loan" d="${smooth(loanPts)}"/>
              <circle class="point ret" cx="${retPts[last][0].toFixed(2)}" cy="${retPts[last][1].toFixed(2)}" r="1.05"/>
              <circle class="point loan" cx="${loanPts[last][0].toFixed(2)}" cy="${loanPts[last][1].toFixed(2)}" r="1.05"/>
              ${slices}
            </svg>
            <div class="line-labels">${xlabels}</div>
            <div class="chart-tooltip" id="chartTip" hidden></div>
            <p class="chart-note">${days} hari terakhir</p>
          </div>
        </div>`;
      } catch (err) { return `<p class="muted">Gagal memuat grafik.</p>`; }
    }

    function bindChartTip() {
      const tip = document.getElementById("chartTip");
      if (!tip) return;
      const hide = () => { tip.hidden = true; };
      document.querySelectorAll(".hover-slice").forEach(sl => {
        sl.addEventListener("mousemove", () => {
          tip.innerHTML = `<div class="tt-date">${esc(sl.dataset.date || "")}</div>
            <div class="tt-row"><i style="background:var(--primary);"></i>Peminjaman <b>${esc(sl.dataset.loan || 0)}</b></div>
            <div class="tt-row"><i style="background:var(--success);"></i>Pengembalian <b>${esc(sl.dataset.ret || 0)}</b></div>`;
          let pct = parseFloat(sl.dataset.tx);
          if (!isFinite(pct)) pct = 50;
          pct = Math.max(9, Math.min(91, pct));
          tip.style.left = pct + "%";
          tip.style.transform = "translateX(-50%)";
          tip.hidden = false;
        });
        sl.addEventListener("mouseleave", hide);
      });
    }
  }

  function errorPanel(err) {
    return `
      <div class="dash-section" style="margin-top:8px;">
        <div class="alert-block info" style="cursor:default;">
          <span class="ab-icon">${ICONS.alert}</span>
          <span class="ab-info"><b>Terjadi kendala saat memuat dashboard</b><span>${esc(err && err.message || "Data tidak ditemukan")}</span></span>
        </div>
      </div>`;
  }

  function skeletonAdmin() {
    return `
      <div class="skel-hero"><div style="padding:30px;"><div class="skel skel-line w60"></div><div class="skel skel-line w80"></div><div class="skel skel-line w40"></div></div></div>
      <div class="alert-strip">
        ${[0, 1, 2].map(() => `<div class="skel-card"><div class="skel skel-line w60"></div><div class="skel skel-line w90"></div></div>`).join("")}
      </div>
      <div class="dash-stats">
        ${[0, 1, 2, 3].map(() => `<div class="skel-card"><div class="skel skel-line w40"></div><div class="skel skel-line w80"></div></div>`).join("")}
      </div>
      <div class="dash-grid-2">
        <div class="skel-card"><div class="skel skel-line w60"></div><div class="skel skel-line" style="height:140px;"></div></div>
        <div class="skel-card"><div class="skel skel-line w60"></div><div class="skel skel-line"></div><div class="skel skel-line w80"></div></div>
      </div>`;
  }

  /* ================= NOTIF DROPDOWN ADMIN ================= */
  function buildAdminNotifPanel(panel) {
    const dbx = db();
    const items = [];

    (dbx.loans || []).filter(l => l.status === "requested").forEach(l => {
      const b = bookById(l.book_id);
      const std = studentById(l.student_id);
      items.push({
        nav: "peminjaman", icon: "🕓", cls: "warning",
        title: "Permintaan pinjaman baru",
        msg: `${std ? std.nama : "Siswa"} meminta "${b ? b.judul : "-"}"`,
        time: l.loan_date, date: l.loan_date
      });
    });
    (dbx.book_requests || []).filter(r => r.status === "pending").forEach(r => {
      const t = (dbx.teacher_profiles || []).find(x => x.id === r.teacher_id);
      items.push({
        nav: "usulanGuru", icon: "📤", cls: "warning",
        title: "Usulan buku menunggu review",
        msg: `${t ? t.nama : "Guru"} mengusulkan "${r.title}"`,
        time: r.created_at, date: r.created_at
      });
    });
    (dbx.users || []).filter(u => u.role === "guru" && u.status === "pending").forEach(u => {
      items.push({
        nav: "guru", icon: "👤", cls: "warning",
        title: "Registrasi guru baru",
        msg: `${u.name} menunggu persetujuan akun`,
        time: u.created_at || new Date().toISOString(), date: u.created_at || new Date().toISOString()
      });
    });
    (dbx.notifications || []).filter(n => (n.type === "due" || n.type === "late") && !n.is_read).forEach(n => {
      items.push({
        nav: "pengembalian", icon: n.type === "late" ? "🚨" : "⏰", cls: n.type === "late" ? "danger" : "warning",
        title: n.title, msg: n.message, time: n.created_at, date: n.created_at
      });
    });

    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    const html = `
      <div class="np-head"><b>Notifikasi Admin</b></div>
      <div class="np-list">
        ${items.length ? items.slice(0, 8).map(n => `
          <div class="np-item ${n.cls}" data-anav="${n.nav}">
            <span class="np-icon">${n.icon}</span>
            <div class="np-body"><b>${esc(n.title)}</b><p>${esc(n.msg)}</p>${n.time ? `<div class="time">${timeAgo(n.time)}</div>` : ""}</div>
          </div>`).join("") : `<div class="np-item"><span class="np-icon">${ICONS.bell}</span><div class="np-body"><b>Tidak ada notifikasi</b><p>Semua aman.</p></div></div>`}
      </div>
      <div class="np-foot"><a style="cursor:pointer;" onclick="window.__NAV__.notifikasi(); document.getElementById('topNotifPanel') && (document.getElementById('topNotifPanel').hidden = true);">Lihat semua notifikasi →</a></div>`;

    panel.innerHTML = html;
    panel.querySelectorAll("[data-anav]").forEach(el => el.onclick = () => {
      panel.hidden = true;
      go(el.dataset.anav);
    });
  }

  function statCard(color, icon, num, lbl, trend, extra) {
    const colors = { blue: ["var(--primary-soft)", "var(--primary)"], green: ["var(--success-soft)", "var(--success)"], orange: ["var(--warning-soft)", "var(--warning)"], red: ["var(--danger-soft)", "var(--danger)"], yellow: ["var(--accent-soft)", "#B07D00"] };
    const c = colors[color] || colors.blue;
    return `
      <div class="stat-card" ${extra || ""}>
        <div class="stat-icon" style="background:${c[0]};color:${c[1]};">${icon}</div>
        <div>
          <div class="stat-info">
            <div class="num">${num}</div>
            <div class="lbl">${lbl}</div>
            <div class="trend" style="color:${c[1]};">${trend}</div>
          </div>
        </div>
      </div>`;
  }

  /* ================= DATA BUKU ================= */
  function renderBuku() {
    const dbx = db();
    const full = dbx.books.slice().sort((a, b) => a.kode.localeCompare(b.kode));
    let q = "";

    const totalStok = full.reduce((a, b) => a + b.total, 0);
    const tersedia = full.reduce((a, b) => a + b.available, 0);

    function draw() {
      const filtered = q ? full.filter(x => x.judul.toLowerCase().includes(q) || x.penulis.toLowerCase().includes(q) || x.kode.toLowerCase().includes(q) || (x.isbn || "").toLowerCase().includes(q)) : full;
      return `
        <div class="page-head flex justify-between items-center flex-wrap gap-8">
          <div><h1>Data Buku</h1><p>${full.length} judul • ${totalStok} eksemplar • ${tersedia} tersedia.</p></div>
          <button class="btn" id="addBook">${ICONS.plus} Tambah Buku</button>
        </div>
        <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:20px;">
          ${statCard("blue", ICONS.book, full.length, "Judul Buku", "Total koleksi")}
          ${statCard("green", ICONS.box, tersedia, "Eksemplar Tersedia", "Siap dipinjam")}
          ${statCard("orange", ICONS.loan, full.reduce((a, b) => a + b.borrowed, 0), "Sedang Dipinjam", "Beredar")}
        </div>
        <div class="search-bar mb-16" style="max-width:480px;">
          ${ICONS.search}<input type="text" id="bkSearch" placeholder="Cari judul, penulis, ISBN, atau kode..." value="${esc(q)}">
        </div>
        <div class="table-wrap">
          <table class="table table-cards">
            <thead><tr><th>Kode</th><th>Judul</th><th>Kategori</th><th>Rak</th><th>Stok</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              ${filtered.map(b => {
                const st = bookStatus(b);
                return `<tr>
                  <td data-label="Kode" class="text-xs"><b>${esc(b.kode)}</b></td>
                  <td data-label="Judul"><div class="td-cell">${coverThumb(b)}<div><div class="td-title">${esc(b.judul)}</div><div class="sub">${esc(b.penulis)} • ${esc(b.tahun)}</div></div></div></td>
                  <td data-label="Kategori"><span class="badge badge-neutral">${esc(categoryName(b.kategori_id))}</span></td>
                  <td data-label="Rak">${esc(b.rak)}</td>
                  <td data-label="Stok"><span style="font-weight:750;">${b.available}</span><span class="muted">/${b.total}</span></td>
                  <td data-label="Status"><span class="badge badge-${st.type}">${esc(st.label)}</span></td>
                  <td data-label="Aksi">
                    <div class="td-actions">
                      <button class="action-btn" title="Ubah" data-edit="${b.id}">${ICONS.edit}</button>
                      <button class="action-btn red" title="Hapus" data-del="${b.id}">${ICONS.trash}</button>
                    </div>
                  </td>
                </tr>`;
              }).join("")}
              ${!filtered.length ? `<tr class="row-empty"><td colspan="7">Buku tidak ditemukan.</td></tr>` : ""}
            </tbody>
          </table>
        </div>`;
    }

    function drawAndBind() {
      render(draw());
      document.getElementById("addBook").onclick = () => bookForm();
      document.getElementById("bkSearch").oninput = (e) => { q = e.target.value.toLowerCase(); drawAndBind(); };
      document.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => bookForm(b.dataset.edit));
      document.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
        const bo = bookById(b.dataset.del);
        A.confirmDialog("Hapus Buku", `Hapus buku <b>"${esc(bo.judul)}"</b>? Histori transaksi tetap tersimpan.`, () => {
          const dbx2 = db();
          dbx2.books = dbx2.books.filter(x => x.id !== bo.id);
          saveDB(dbx2); logAction("Hapus", "Buku", `Hapus ${bo.kode} - ${bo.judul}`);
          A.toast("success", "Buku dihapus");
          renderBuku();
        }, { danger: true });
      });
    }

    drawAndBind();
  }

  function bookForm(bookId) {
    const dbx = db();
    const b = bookId ? dbx.books.find(x => x.id === bookId) : null;
    const nextCode = "BK" + String(dbx.books.length + 1).padStart(3, "0");
    const cats = dbx.categories;

    A.openModal(b ? `Ubah Buku — ${esc(b.kode)}` : "Tambah Buku", `
      <form id="bookForm" class="mt-8">
        <input type="hidden" id="fId" value="${b ? b.id : ""}">
        <div class="form-section"><b>${ICONS.book} Identitas Buku</b>
          <div class="form-grid">
            <div class="field"><label>Kode</label><input class="input" id="fKode" value="${esc(b ? b.kode : nextCode)}"></div>
            <div class="field"><label>ISBN</label><input class="input" id="fIsbn" value="${esc(b ? b.isbn : "")}" placeholder="978-xxx"></div>
            <div class="field" style="grid-column:1 / -1;"><label>Judul *</label><input class="input" id="fJudul" value="${esc(b ? b.judul : "")}" placeholder="Judul buku" required></div>
            <div class="field"><label>Penulis *</label><input class="input" id="fPenulis" value="${esc(b ? b.penulis : "")}" required></div>
            <div class="field"><label>Penerbit</label><input class="input" id="fPenerbit" value="${esc(b ? b.penerbit : "")}"></div>
            <div class="field"><label>Tahun Terbit</label><input class="input" type="number" id="fTahun" value="${b ? b.tahun : new Date().getFullYear()}" min="1900" max="2100"></div>
            <div class="field"><label>Kategori</label><select class="select" id="fKategori">${cats.map(c => `<option value="${c.id}" ${b && b.kategori_id === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
          </div>
        </div>
        <div class="form-section"><b>${ICONS.box} Stok & Penempatan</b>
          <div class="form-grid">
            <div class="field"><label>Rak</label><input class="input" id="fRak" value="${esc(b ? b.rak : "A-01")}"></div>
            <div class="field"><label>Stok Total</label><input class="input" type="number" id="fTotal" value="${b ? b.total : 5}" min="0"></div>
          </div>
          <div class="field"><label>Kondisi</label><select class="select" id="fKondisi"><option ${!b || b.kondisi === "Baik" ? "selected" : ""}>Baik</option><option ${b && b.kondisi === "Rusak Ringan" ? "selected" : ""}>Rusak Ringan</option><option ${b && b.kondisi === "Rusak" ? "selected" : ""}>Rusak</option><option ${b && b.kondisi === "Hilang" ? "selected" : ""}>Hilang</option></select></div>
        </div>
        <div class="form-section"><b>${ICONS.eye} Tampilan</b>
          <div class="field">
            <label>Kover Buku</label>
            <div class="cover-upload-box">
              <div class="flex items-center gap-12">
                <img class="cover-preview" id="coverPreview" src="${esc(b && b.cover ? b.cover : "assets/books/book-fallback.svg")}" alt="Preview kover">
                <div style="flex:1;">
                  <input class="input" id="fCover" value="${esc(b ? b.cover : "")}" placeholder="URL kover (opsional)">
                  <input class="input mt-8" type="file" id="fCoverFile" accept="image/*">
                  <small class="muted text-xs">Bisa memakai URL gambar atau unggah file JPG/PNG/WebP. File unggahan disimpan di browser.</small>
                </div>
              </div>
            </div>
          </div>
          <div class="field"><label>Sinopsis</label><textarea class="textarea" id="fSinopsis" placeholder="Ringkasan isi buku...">${esc(b ? b.sinopsis : "")}</textarea></div>
        </div>
        <div class="flex justify-end gap-12 mt-8">
          <button class="btn btn-outline btn-sm" type="button" id="bkClose">Batal</button>
          <button class="btn btn-sm" type="submit">${b ? "Simpan Perubahan" : "Tambah Buku"}</button>
        </div>
      </form>`, {
      onOpen: (ov) => {
        ov.querySelector("#bkClose").onclick = ov.close;
        const coverFile = ov.querySelector("#fCoverFile");
        const coverInput = ov.querySelector("#fCover");
        const coverPreview = ov.querySelector("#coverPreview");
        if (coverFile) coverFile.onchange = () => {
          const file = coverFile.files && coverFile.files[0];
          if (!file) return;
          if (!file.type.startsWith("image/")) { A.toast("warning", "File tidak valid", "Pilih file gambar."); coverFile.value = ""; return; }
          if (file.size > 2.5 * 1024 * 1024) { A.toast("warning", "File terlalu besar", "Maksimal ukuran kover 2,5 MB."); coverFile.value = ""; return; }
          const reader = new FileReader();
          reader.onload = () => { coverInput.value = reader.result; coverPreview.src = reader.result; };
          reader.readAsDataURL(file);
        };
        coverInput.oninput = () => { if (coverInput.value.trim()) coverPreview.src = coverInput.value.trim(); };
        ov.querySelector("#bookForm").onsubmit = (e) => {
          e.preventDefault();
          const judul = ov.querySelector("#fJudul").value.trim();
          const penulis = ov.querySelector("#fPenulis").value.trim();
          if (!judul || !penulis) { A.toast("warning", "Lengkapi data", "Judul dan penulis wajib diisi."); return; }
          const dbx2 = db();
          const data = {
            kode: ov.querySelector("#fKode").value.trim() || nextCode,
            isbn: ov.querySelector("#fIsbn").value.trim(),
            judul, penulis,
            penerbit: ov.querySelector("#fPenerbit").value.trim(),
            tahun: parseInt(ov.querySelector("#fTahun").value) || 2024,
            kategori_id: ov.querySelector("#fKategori").value,
            rak: ov.querySelector("#fRak").value.trim() || "A-01",
            kondisi: ov.querySelector("#fKondisi").value,
            cover: ov.querySelector("#fCover").value.trim(),
            sinopsis: ov.querySelector("#fSinopsis").value.trim()
          };
          const total = parseInt(ov.querySelector("#fTotal").value) || 0;
          if (b) {
            const idx = dbx2.books.findIndex(x => x.id === b.id);
            dbx2.books[idx] = { ...dbx2.books[idx], ...data, total: Math.max(total, dbx2.books[idx].borrowed), available: Math.max(0, total - dbx2.books[idx].borrowed - dbx2.books[idx].damaged - dbx2.books[idx].lost) };
            logAction("Ubah", "Buku", `Update ${data.kode} - ${data.judul}`);
            A.toast("success", "Buku diperbarui");
          } else {
            dbx2.books.push({
              id: uid("bk-"), ...data, total, available: total, borrowed: 0, damaged: 0, lost: 0
            });
            logAction("Tambah", "Buku", `Tambah ${data.kode} - ${data.judul}`);
            A.toast("success", "Buku ditambahkan");
          }
          saveDB(dbx2); ov.close(); renderBuku();
        };
      }
    });
  }

  /* ================= KATEGORI ================= */
  function renderKategori() {
    const dbx = db();
    const cats = dbx.categories;

    const html = `
      <div class="page-head flex justify-between items-center flex-wrap gap-8">
        <div><h1>Kategori Buku</h1><p>Kelola kategori dan subkategori koleksi.</p></div>
        <button class="btn" id="addCat">${ICONS.plus} Tambah Kategori</button>
      </div>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;">
        ${cats.map(c => {
          const count = dbx.books.filter(b => b.kategori_id === c.id).length;
          const totalStok = dbx.books.filter(b => b.kategori_id === c.id).reduce((a, b) => a + b.total, 0);
          return `<div class="card card-hover">
            ${accentBar("var(--primary)")}
            <div class="flex justify-between items-center" style="margin-bottom:10px;">
              <div class="stat-icon blue" style="background:var(--primary-soft);color:var(--primary);">${ICONS.grid}</div>
              <div class="td-actions">
                <button class="action-btn" data-cat-edit="${c.id}">${ICONS.edit}</button>
                <button class="action-btn red" data-cat-del="${c.id}" ${count > 0 ? "disabled" : ""}>${ICONS.trash}</button>
              </div>
            </div>
            <h3 style="font-size:16px;font-weight:800;margin-bottom:4px;">${esc(c.name)}</h3>
            <p class="muted text-sm" style="margin-bottom:12px;">${esc(c.desc || "")}</p>
            <div class="flex gap-8">
              <span class="badge badge-primary">${count} judul</span>
              <span class="badge badge-neutral">${totalStok} eksemplar</span>
            </div>
          </div>`;
        }).join("")}
      </div>`;

    render(html);
    document.getElementById("addCat").onclick = () => catForm();
    document.querySelectorAll("[data-cat-edit]").forEach(b => b.onclick = () => catForm(b.dataset.catEdit));
    document.querySelectorAll("[data-cat-del]").forEach(b => b.onclick = () => {
      const c = dbx.categories.find(x => x.id === b.dataset.catDel);
      A.confirmDialog("Hapus Kategori", `Hapus kategori <b>"${esc(c.name)}"</b>?`, () => {
        const d2 = db();
        if (d2.books.some(x => x.kategori_id === c.id)) { A.toast("error", "Gagal", "Kategori masih memiliki buku."); return; }
        d2.categories = d2.categories.filter(x => x.id !== c.id);
        saveDB(d2); logAction("Hapus", "Kategori", `Hapus ${c.name}`);
        A.toast("success", "Kategori dihapus"); renderKategori();
      }, { danger: true });
    });
  }

  function catForm(catId) {
    const dbx = db();
    const c = catId ? dbx.categories.find(x => x.id === catId) : null;
    A.openModal(c ? "Ubah Kategori" : "Tambah Kategori", `
      <form id="catForm" class="mt-8">
        <div class="field"><label>Nama Kategori *</label><input class="input" id="cName" value="${esc(c ? c.name : "")}" required placeholder="Contoh: Teknologi Informasi"></div>
        <div class="field"><label>Deskripsi</label><input class="input" id="cDesc" value="${esc(c ? c.desc : "")}" placeholder="Deskripsi singkat"></div>
        <div class="flex justify-end gap-12 mt-8"><button class="btn btn-outline btn-sm" type="button" id="cClose">Batal</button><button class="btn btn-sm" type="submit">Simpan</button></div>
      </form>`, {
      onOpen: (ov) => {
        ov.querySelector("#cClose").onclick = ov.close;
        ov.querySelector("#catForm").onsubmit = (e) => {
          e.preventDefault();
          const name = ov.querySelector("#cName").value.trim();
          if (!name) { A.toast("warning", "Nama wajib diisi"); return; }
          const d2 = db();
          const data = { name, desc: ov.querySelector("#cDesc").value.trim() };
          if (c) {
            const i = d2.categories.findIndex(x => x.id === c.id);
            d2.categories[i] = { ...d2.categories[i], ...data };
            logAction("Ubah", "Kategori", `Update ${name}`);
          } else {
            d2.categories.push({ id: uid("cat-"), ...data });
            logAction("Tambah", "Kategori", `Tambah ${name}`);
          }
          saveDB(d2); ov.close(); renderKategori();
          A.toast("success", "Kategori disimpan");
        };
      }
    });
  }

  /* ================= STOK ================= */
  function renderStok() {
    const dbx = db();
    const list = dbx.books.slice().sort((a, b) => a.kode.localeCompare(b.kode));
    const totalAll = list.reduce((a, b) => a + b.total, 0);
    const availAll = list.reduce((a, b) => a + b.available, 0);
    const borAll = list.reduce((a, b) => a + b.borrowed, 0);
    const badAll = list.reduce((a, b) => a + b.damaged + b.lost, 0);

    const html = `
      <div class="page-head">
        <h1>Manajemen Stok</h1>
        <p>Pantau total, tersedia, dipinjam, rusak, dan hilang setiap buku.</p>
      </div>
      <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:20px;">
        ${statCard("blue", ICONS.box, totalAll, "Total Eksemplar", "Seluruh koleksi")}
        ${statCard("green", ICONS.check, availAll, "Tersedia", "Siap dipinjam")}
        ${statCard("orange", ICONS.loan, borAll, "Dipinjam", "Sedang beredar")}
        ${statCard("red", ICONS.alert, badAll, "Rusak / Hilang", "Perlu dicatat")}
      </div>
      <div class="table-wrap">
        <table class="table table-cards">
          <thead><tr><th>Kode</th><th>Judul</th><th colspan="4" style="text-align:center;">Stok</th><th>Aksi</th></tr></thead>
          <thead class="thead-sub"><tr><th></th><th></th>
            <th style="text-align:center;color:var(--primary);">Total</th>
            <th style="text-align:center;color:var(--success);">Tersedia</th>
            <th style="text-align:center;color:var(--warning);">Dipinjam</th>
            <th style="text-align:center;color:var(--danger);">Rusak/Hilang</th><th></th></tr></thead>
          <tbody>
            ${list.map(b => `<tr>
              <td data-label="Kode" class="text-xs"><b>${esc(b.kode)}</b></td>
              <td data-label="Judul"><div class="td-cell">${coverThumb(b)}<div><div class="td-title">${esc(b.judul)}</div><div class="sub">${esc(b.penulis)}</div></div></div></td>
              <td data-label="Total" class="num-center">${b.total}</td>
              <td data-label="Tersedia" class="num-success">${b.available}</td>
              <td data-label="Dipinjam" class="num-warning">${b.borrowed}</td>
              <td data-label="Rusak/Hilang" class="num-danger">${b.damaged + b.lost}</td>
              <td data-label="Aksi"><div class="cell-actions"><button class="btn btn-ghost btn-sm" style="font-weight:700;" data-stok="${b.id}">Ubah Stok</button></div></td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <div class="legend mt-16">
        <span><i style="background:var(--primary);"></i> Total eksemplar</span>
        <span><i style="background:var(--success);"></i> Tersedia dipinjam</span>
        <span><i style="background:var(--warning);"></i> Sedang dipinjam</span>
        <span><i style="background:var(--danger);"></i> Rusak / hilang</span>
      </div>`;

    render(html);
    document.querySelectorAll("[data-stok]").forEach(b => b.onclick = () => stockForm(b.dataset.stok));
  }

  function stockForm(bookId) {
    const dbx = db();
    const b = dbx.books.find(x => x.id === bookId);
    A.openModal(`Ubah Stok — ${esc(b.kode)}`, `
      <div class="small-card mt-12 mb-16">
        <div class="flex items-center gap-12">
          ${coverThumb(b)}
          <div><b>${esc(b.judul)}</b>
          <div class="flex justify-between text-sm muted" style="gap:16px;margin-top:6px;">
            <span>Total: <b>${b.total}</b></span><span>Tersedia: <b>${b.available}</b></span><span>Dipinjam: <b>${b.borrowed}</b></span>
          </div></div>
        </div>
      </div>
      <form id="stockForm">
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label>Perbarui Stok Total</label><input class="input" type="number" id="sTotal" value="${b.total}" min="${b.borrowed}"></div>
          <div class="field"><label>Tambah Rusak</label><input class="input" type="number" id="sRusak" value="0" min="0"></div>
        </div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label>Tambah Hilang</label><input class="input" type="number" id="sHilang" value="0" min="0"></div>
          <div class="field"><label>Perbaiki Stok Tersedia</label><input class="input" type="number" id="sAvail" value="${b.available}" min="0"></div>
        </div>
        <p class="muted text-xs mb-12">Total = Tersedia + Dipinjam + Rusak + Hilang</p>
        <div class="flex justify-end gap-12"><button class="btn btn-outline btn-sm" type="button" id="sClose">Batal</button><button class="btn btn-sm" type="submit">Simpan Stok</button></div>
      </form>`, {
      onOpen: (ov) => {
        ov.querySelector("#sClose").onclick = ov.close;
        ov.querySelector("#stockForm").onsubmit = (e) => {
          e.preventDefault();
          const total = parseInt(ov.querySelector("#sTotal").value) || b.total;
          const rusak = b.damaged + (parseInt(ov.querySelector("#sRusak").value) || 0);
          const hilang = b.lost + (parseInt(ov.querySelector("#sHilang").value) || 0);
          const avail = parseInt(ov.querySelector("#sAvail").value) || 0;
          if (total < b.borrowed + rusak + hilang) { A.toast("error", "Stok tidak valid", "Total minimal sama dengan dipinjam+rusak+hilang."); return; }
          if (avail > total - b.borrowed - rusak - hilang) { A.toast("error", "Stok tersedia terlalu besar"); return; }
          const d2 = db();
          const i = d2.books.findIndex(x => x.id === bookId);
          d2.books[i] = { ...d2.books[i], total, damaged: rusak, lost: hilang, available: avail };
          saveDB(d2); logAction("Ubah", "Stok", `Update stok ${b.kode}: total ${total}, rusak ${rusak}, hilang ${hilang}`);
          A.toast("success", "Stok diperbarui"); ov.close(); renderStok();
        };
      }
    });
  }

  /* ================= SISWA ================= */
  function renderSiswa() {
    const dbx = db();
    const rows = dbx.students.slice().sort((a, b) => a.nama.localeCompare(b.nama));

    function findUser(std) { return dbx.users.find(u => u.id === std.user_id); }

    const activeCount = rows.filter(s => { const u = findUser(s); return u && u.status === "Aktif"; }).length;
    const activeLoansNow = dbx.loans.filter(l => ["active", "overdue"].includes(l.status)).length;

    const html = `
      <div class="page-head flex justify-between items-center flex-wrap gap-8">
        <div><h1>Data Siswa</h1><p>${rows.length} siswa terdaftar sebagai anggota perpustakaan.</p></div>
        <button class="btn" id="addStd">${ICONS.plus} Tambah Siswa</button>
      </div>
      <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:20px;">
        ${statCard("blue", ICONS.users, rows.length, "Total Siswa", "Anggota terdaftar")}
        ${statCard("green", ICONS.check, activeCount, "Akun Aktif", "Dapat meminjam")}
        ${statCard("orange", ICONS.loan, activeLoansNow, "Pinjaman Aktif", "Sedang berjalan")}
      </div>
      <div class="table-wrap">
        <table class="table table-cards">
          <thead><tr><th>Siswa</th><th>NIS</th><th>Kelas</th><th>Jurusan</th><th>Dipinjam</th><th>Status Akun</th><th>Aksi</th></tr></thead>
          <tbody>
            ${rows.map(std => {
              const u = findUser(std);
              const active = dbx.loans.filter(l => l.student_id === std.id && ["active", "overdue"].includes(l.status)).length;
              return `<tr>
                <td data-label="Siswa"><div class="td-cell">${avatarMini(std.nama)}<div><div class="td-title">${esc(std.nama)}</div><div class="sub">${esc(std.email || "")}</div></div></div></td>
                <td data-label="NIS">${esc(std.nis)}</td>
                <td data-label="Kelas">${esc(std.kelas)}</td>
                <td data-label="Jurusan">${esc(std.jurusan)}</td>
                <td data-label="Dipinjam"><span class="badge ${active > 0 ? "badge-primary" : "badge-neutral"}">${active} buku</span></td>
                <td data-label="Status Akun">${u && u.status === "Aktif" ? '<span class="badge badge-success">Aktif</span>' : '<span class="badge badge-danger">Nonaktif</span>'}</td>
                <td data-label="Aksi">
                  <div class="td-actions">
                    <button class="action-btn" title="Detail" data-std-view="${std.id}">${ICONS.user}</button>
                    <button class="action-btn" title="Edit" data-std-edit="${std.id}">${ICONS.edit}</button>
                    <button class="action-btn ${u && u.status === "Aktif" ? "red" : "green"}" title="${u && u.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"}" data-std-tog="${std.id}">${u && u.status === "Aktif" ? ICONS.x : ICONS.check}</button>
                    <button class="action-btn red" title="Hapus Akun" data-std-del="${std.id}">${ICONS.trash}</button>
                  </div>
                </td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`;

    render(html);
    document.getElementById("addStd").onclick = () => studentForm();
    document.querySelectorAll("[data-std-view]").forEach(b => b.onclick = () => studentDetail(b.dataset.stdView));
    document.querySelectorAll("[data-std-edit]").forEach(b => b.onclick = () => studentForm(b.dataset.stdEdit));
    document.querySelectorAll("[data-std-del]").forEach(b => b.onclick = () => deleteStudent(b.dataset.stdDel));
    document.querySelectorAll("[data-std-tog]").forEach(b => b.onclick = () => {
      const std = dbx.students.find(x => x.id === b.dataset.stdTog);
      const u = findUser(std);
      A.confirmDialog(u.status === "Aktif" ? "Nonaktifkan Akun" : "Aktifkan Akun",
        `Ubah status akun <b>"${esc(std.nama)}"</b> menjadi <b>${u.status === "Aktif" ? "Nonaktif" : "Aktif"}</b>?`,
        () => {
          const d2 = db();
          const ui = d2.users.findIndex(x => x.id === u.id);
          d2.users[ui].status = u.status === "Aktif" ? "Nonaktif" : "Aktif";
          saveDB(d2); logAction("Ubah", "Siswa", `${u.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"} ${std.nama}`);
          A.toast("success", "Status akun diperbarui"); renderSiswa();
        }, { danger: u.status === "Aktif", yesLabel: u.status === "Aktif" ? "Nonaktifkan" : "Aktifkan" });
    });
  }

  function studentForm(stdId) {
    const dbx = db();
    const st = stdId ? dbx.students.find(x => x.id === stdId) : null;
    const us = st ? dbx.users.find(x => x.id === st.user_id) : null;

    A.openModal(st ? `Ubah Siswa — ${esc(st.nama)}` : "Tambah Siswa", `
      <form id="stdForm" class="mt-8">
        <input type="hidden" id="sId" value="${st ? st.id : ""}">
        <div class="form-section"><b>${ICONS.users} Data Identitas</b>
          <div class="form-grid">
            <div class="field"><label>NIS / NISN *</label><input class="input" id="sNis" value="${esc(st ? st.nis : "")}" required placeholder="2025107"></div>
            <div class="field"><label>Nama Lengkap *</label><input class="input" id="sNama" value="${esc(st ? st.nama : "")}" required></div>
            <div class="field"><label>Kelas</label><select class="select" id="sKelas">${["X","XI","XII"].map(k => `<option ${st && st.kelas === k ? "selected" : ""}>${k}</option>`).join("")}</select></div>
            <div class="field"><label>Jurusan</label><select class="select" id="sJurusan">${SMA_JURUSAN.map(j => `<option ${st && st.jurusan === j ? "selected" : ""}${!st && j === "IPA 1" ? " selected" : ""}>${j}</option>`).join("")}</select></div>
            <div class="field"><label>Jenis Kelamin</label><select class="select" id="sGender"><option ${!st || st.gender === "L" ? "selected" : ""}>L</option><option ${st && st.gender === "P" ? "selected" : ""}>P</option></select></div>
            <div class="field"><label>Email</label><input class="input" id="sEmail" value="${esc(st ? st.email : "")}"></div>
            <div class="field"><label>Kontak</label><input class="input" id="sKontak" value="${esc(st ? st.kontak : "")}"></div>
          </div>
        </div>
        <div class="form-section"><b>${ICONS.lock} Akun Login</b>
          <div class="form-grid">
            <div class="field"><label>Password Akun</label><input class="input" id="sPass" value="${us ? us.password : ""}" placeholder="siswa123"></div>
            <div class="field"><label>Status</label><select class="select" id="sStatus"><option ${!us || us.status === "Aktif" ? "selected" : ""}>Aktif</option><option ${us && us.status === "Nonaktif" ? "selected" : ""}>Nonaktif</option></select></div>
          </div>
        </div>
        <div class="flex justify-end gap-12 mt-8">
          <button class="btn btn-outline btn-sm" type="button" id="sClose">Batal</button>
          <button class="btn btn-sm" type="submit">${st ? "Simpan" : "Tambah Siswa"}</button>
        </div>
      </form>`, {
      onOpen: (ov) => {
        ov.querySelector("#sClose").onclick = ov.close;
        ov.querySelector("#stdForm").onsubmit = (e) => {
          e.preventDefault();
          const nis = ov.querySelector("#sNis").value.trim();
          const nama = ov.querySelector("#sNama").value.trim();
          if (!nis || !nama) { A.toast("warning", "NIS dan nama wajib diisi"); return; }
          const d2 = db();
          if (d2.students.some(x => x.nis === nis && x.id !== (st ? st.id : ""))) { A.toast("error", "NIS sudah digunakan"); return; }
          const pass = ov.querySelector("#sPass").value || "siswa123";
          const jurusan = ov.querySelector("#sJurusan").value;
          if (st) {
            const si = d2.students.findIndex(x => x.id === st.id);
            d2.students[si] = { ...d2.students[si], nis, nama, kelas: ov.querySelector("#sKelas").value, jurusan, gender: ov.querySelector("#sGender").value, email: ov.querySelector("#sEmail").value.trim(), kontak: ov.querySelector("#sKontak").value.trim() };
            const ui = d2.users.findIndex(x => x.id === st.user_id);
            d2.users[ui].password = pass;
            d2.users[ui].status = ov.querySelector("#sStatus").value;
            d2.users[ui].name = nama;
            logAction("Ubah", "Siswa", `Update ${nama}`);
          } else {
            const newU = { id: uid("usr-"), username: nis, password: pass, role: "siswa", status: ov.querySelector("#sStatus").value, name: nama };
            d2.users.push(newU);
            d2.students.push({ id: uid("std-"), user_id: newU.id, nis, nama, kelas: ov.querySelector("#sKelas").value, jurusan, gender: ov.querySelector("#sGender").value, email: ov.querySelector("#sEmail").value.trim(), kontak: ov.querySelector("#sKontak").value.trim(), foto: "" });
            logAction("Tambah", "Siswa", `Tambah ${nama} (${nis})`);
          }
          saveDB(d2); ov.close(); renderSiswa();
          A.toast("success", "Data siswa disimpan");
        };
      }
    });
  }

  function studentDetail(stdId) {
    const dbx = db();
    const std = dbx.students.find(x => x.id === stdId);
    const loans = dbx.loans.filter(l => l.student_id === stdId).slice().sort((a, b) => new Date(b.loan_date) - new Date(a.loan_date));
    const active = loans.filter(l => ["active", "overdue"].includes(l.status));
    const history = loans.filter(l => l.status === "returned");

    const body = `
      <div class="flex items-center gap-12 mb-16">
        <div class="profile-avatar" style="width:64px;height:64px;font-size:22px;">${std.nama.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase()}</div>
        <div><b style="font-size:17px;">${esc(std.nama)}</b>
          <div class="muted text-sm">NIS ${esc(std.nis)} • ${esc(std.kelas)} ${esc(std.jurusan)}</div>
          <div class="muted text-sm">${esc(std.email || "")} • ${esc(std.kontak || "")}</div></div>
      </div>
      <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);gap:10px;">
        <div class="small-card"><b>${loans.length}</b><div class="muted text-xs">Total transaksi</div></div>
        <div class="small-card"><b>${active.length}</b><div class="muted text-xs">Pinjaman aktif</div></div>
        <div class="small-card"><b>${history.length}</b><div class="muted text-xs">Selesai</div></div>
      </div>
      <h4 style="margin:16px 0 10px;font-size:14px;font-weight:700;">Riwayat Peminjaman</h4>
      ${loans.length ? loans.slice(0, 6).map(l => {
        const b = bookById(l.book_id);
        return `<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #F0F5FA;font-size:13px;">
          <div style="min-width:0;"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(b ? b.judul : "-")}</b><span class="muted text-xs">${esc(l.loan_code)}</span></div>
          <div style="text-align:right;flex-shrink:0;">${A.loanBadge(l)}<div class="muted text-xs mt-8">${fmtDate(l.loan_date)} - ${l.return_date ? fmtDate(l.return_date) : "aktif"}</div></div>
        </div>`;
      }).join("") : "<p class='muted text-sm'>Belum ada transaksi.</p>"}`;

    A.openModal(`Detail Siswa — ${esc(std.nama)}`, body, { onOpen: (ov) => { /* actions already static */ } });
  }

  function deleteStudent(stdId) {
    const dbx = db();
    const st = dbx.students.find(x => x.id === stdId);
    if (!st) return;
    const activeCount = dbx.loans.filter(l => l.student_id === stdId && ["active", "overdue"].includes(l.status)).length;
    A.openModal("Hapus Akun Siswa", `
      <div class="logout-box">
        <div class="logout-avatar glass" style="width:64px;height:64px;background:linear-gradient(135deg,var(--danger-soft),#fff7f7);color:var(--danger);">${ICONS.trash}</div>
        <p class="logout-title">Hapus akun <b>${esc(st.nama)}</b>?</p>
        <p class="logout-sub">${activeCount ? `Siswa masih memiliki <b>${activeCount} pinjaman aktif</b>. ` : ""}Akun, profil, favorit, dan notifikasi siswa akan dihapus dari sistem. Riwayat peminjaman tetap tersimpan sebagai arsip.</p>
        <div class="flex gap-12">
          <button class="btn btn-outline btn-sm" id="dsNo" type="button" style="flex:1;justify-content:center;">Batal</button>
          <button class="btn btn-danger btn-sm" id="dsYes" type="button" style="flex:1;justify-content:center;">Hapus Akun</button>
        </div>
      </div>`, {
      onOpen: (ov) => {
        ov.querySelector("#dsNo").onclick = ov.close;
        ov.querySelector("#dsYes").onclick = () => {
          const d2 = db();
          d2.students = d2.students.filter(x => x.id !== st.id);
          d2.users = d2.users.filter(x => x.id !== st.user_id);
          d2.favorites = d2.favorites.filter(x => x.student_id !== st.id);
          d2.notifications = d2.notifications.filter(x => x.student_id !== st.id);
          saveDB(d2); ov.close();
          logAction("Hapus", "Siswa", `Hapus akun ${st.nama} (${st.nis})`);
          A.toast("success", "Akun siswa dihapus", "Riwayat peminjaman tetap tersimpan.");
          renderSiswa();
        };
      }
    });
  }

  /* ================= GURU (manajemen akun) ================= */
  function renderGuru() {
    const dbx = db();
    const profiles = dbx.teacher_profiles.slice().sort((a, b) => a.nama.localeCompare(b.nama));
    const rows = profiles.map(t => {
      const u = dbx.users.find(x => x.id === t.user_id);
      return { t, u };
    }).concat(dbx.users.filter(u => u.role === "guru" && !profiles.some(p => p.user_id === u.id)).map(u => ({ t: null, u })));

    const html = `
      <div class="page-head flex justify-between items-center flex-wrap gap-8">
        <div><h1>Data Guru</h1><p>${rows.length} akun guru dapat mengakses portal guru perpustakaan.</p></div>
        <button class="btn" id="addGuru">${ICONS.plus} Tambah Guru</button>
      </div>
      <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:20px;">
        ${statCard("blue", ICONS.user, rows.length, "Total Guru", "Akun terdaftar")}
        ${statCard("green", ICONS.check, rows.filter(r => r.u && r.u.status === "Aktif").length, "Akun Aktif", "Dapat mengakses portal")}
        ${statCard("orange", ICONS.upload, dbx.book_requests.filter(x => x.status === "pending").length, "Usulan Pending", "Menunggu review")}
      </div>
      <div class="table-wrap">
        <table class="table table-cards">
          <thead><tr><th>Guru</th><th>NIP</th><th>Mapel</th><th>Kelas</th><th>Status Akun</th><th>Aksi</th></tr></thead>
          <tbody>
            ${rows.map(r => {
              const u = r.u; const t = r.t;
              const ini = String(u.name || (t && t.nama) || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
              return `<tr>
                <td data-label="Guru"><div class="td-cell"><div class="mini-avatar" style="width:40px;height:40px;font-size:13px;">${esc(ini)}</div><div><div class="td-title">${esc(u.name || (t && t.nama) || "-")}</div><div class="sub">${esc(u.username)}${t ? " • " + esc(t.nip) : ""}</div></div></div></td>
                <td data-label="NIP">${esc(t && t.nip ? t.nip : "-")}</td>
                <td data-label="Mapel">${esc(t && t.mapel ? t.mapel : "-")}</td>
                <td data-label="Kelas">${esc(t && t.kelas ? t.kelas : "-")}</td>
                <td data-label="Status Akun">${u && u.status === "Aktif" ? '<span class="badge badge-success">Aktif</span>' : '<span class="badge badge-danger">Nonaktif</span>'}</td>
                <td data-label="Aksi">
                  <div class="td-actions">
                    <button class="action-btn ${u && u.status === "Aktif" ? "red" : "green"}" title="${u && u.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"}" data-gru-tog="${u.id}">${u && u.status === "Aktif" ? ICONS.x : ICONS.check}</button>
                    <button class="action-btn" title="Edit" data-gru-edit="${u.id}">${ICONS.edit}</button>
                    <button class="action-btn red" title="Hapus Akun" data-gru-del="${u.id}">${ICONS.trash}</button>
                  </div>
                </td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`;

    render(html);
    const add = document.getElementById("addGuru");
    if (add) add.onclick = () => teacherForm();
    document.querySelectorAll("[data-gru-edit]").forEach(b => b.onclick = () => teacherForm(b.dataset.gruEdit));
    document.querySelectorAll("[data-gru-tog]").forEach(b => b.onclick = () => {
      const u = dbx.users.find(x => x.id === b.dataset.gruTog);
      A.confirmDialog(u.status === "Aktif" ? "Nonaktifkan Akun" : "Aktifkan Akun",
        `Ubah status akun <b>"${esc(u.name)}"</b> menjadi <b>${u.status === "Aktif" ? "Nonaktif" : "Aktif"}</b>?`,
        () => {
          const d2 = db(); const ui = d2.users.findIndex(x => x.id === u.id);
          d2.users[ui].status = u.status === "Aktif" ? "Nonaktif" : "Aktif";
          saveDB(d2); logAction("Ubah", "Guru", `${u.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"} ${u.name}`);
          A.toast("success", "Status akun diperbarui"); renderGuru();
        }, { danger: u.status === "Aktif", yesLabel: u.status === "Aktif" ? "Nonaktifkan" : "Aktifkan" });
    });
    document.querySelectorAll("[data-gru-del]").forEach(b => b.onclick = () => deleteGuru(b.dataset.gruDel));
  }

  function teacherForm(userId) {
    const dbx = db();
    const u = userId ? dbx.users.find(x => x.id === userId) : null;
    const t = u ? dbx.teacher_profiles.find(x => x.user_id === u.id) : null;

    A.openModal(u ? `Ubah Guru — ${esc(u.name)}` : "Tambah Guru", `
      <form id="gruForm" class="mt-8">
        <input type="hidden" id="gUserId" value="${u ? u.id : ""}">
        <div class="form-section"><b>${ICONS.user} Data Akun</b>
          <div class="form-grid">
            <div class="field"><label>Nama Lengkap *</label><input class="input" id="gNama" value="${esc(u ? u.name : "")}" required placeholder="Contoh: Budi Santoso, S.Pd"></div>
            <div class="field"><label>Username *</label><input class="input" id="gUser" value="${esc(u ? u.username : "")}" required placeholder="nama.guru"></div>
            <div class="field"><label>Password *</label><input class="input" id="gPass" value="${u ? u.password : ""}" required placeholder="min. 6 karakter"></div>
            <div class="field"><label>Status</label><select class="select" id="gStatus"><option ${!u || u.status === "Aktif" ? "selected" : ""}>Aktif</option><option ${u && u.status === "Nonaktif" ? "selected" : ""}>Nonaktif</option></select></div>
          </div>
        </div>
        <div class="form-section"><b>${ICONS.book} Profil & Mengajar</b>
          <div class="form-grid">
            <div class="field"><label>NIP</label><input class="input" id="gNip" value="${esc(t ? t.nip : "")}" placeholder="1967xxxxxxxxxx"></div>
            <div class="field"><label>Mata Pelajaran</label>
              <select class="select" id="gMapel">
                ${["Bahasa Indonesia", "Matematika", "Bahasa Inggris", "Fisika", "Kimia", "Biologi", "Ekonomi", "Sejarah", "Sosiologi", "Geografi", "Pendidikan Pancasila", "Informatika", "Seni Budaya", "PJOK", "Agama"].map(m => `<option ${t && t.mapel === m ? "selected" : ""}>${m}</option>`).join("")}
              </select>
            </div>
            <div class="field" style="grid-column:1 / -1;"><label>Kelas yang Diajar</label>
              <div class="checkbox-row">${["X", "XI", "XII"].map(k => {
                const ta = (t && t.kelas ? String(t.kelas).split(/[,\-–—]+/).map(s => s.trim()) : []);
                return `<label class="checkbox-pill"><input type="checkbox" value="${k}" class="gKelas" ${ta.includes(k) ? "checked" : ""}> ${k}</label>`;
              }).join("")}</div>
            </div>
            <div class="field"><label>Email</label><input class="input" id="gEmail" value="${esc(t ? t.email : "")}"></div>
            <div class="field"><label>No. HP</label><input class="input" id="gHp" value="${esc(t ? t.no_hp : "")}"></div>
          </div>
        </div>
        <div class="flex justify-end gap-12 mt-8">
          <button class="btn btn-outline btn-sm" type="button" id="gClose">Batal</button>
          <button class="btn btn-sm" type="submit">${u ? "Simpan Perubahan" : "Tambah Guru"}</button>
        </div>
      </form>`, {
      onOpen: (ov) => {
        ov.querySelector("#gClose").onclick = ov.close;
        ov.querySelector("#gruForm").onsubmit = (e) => {
          e.preventDefault();
          const nama = ov.querySelector("#gNama").value.trim();
          const user = ov.querySelector("#gUser").value.trim();
          const pass = ov.querySelector("#gPass").value;
          if (!nama || !user || pass.length < 6) { A.toast("warning", "Lengkapi data", "Nama, username, dan password (min. 6 karakter) wajib diisi."); return; }
          const kelas = Array.from(ov.querySelectorAll(".gKelas:checked")).map(c => c.value).join(", ") || "X, XI, XII";
          const d2 = db();
          if (d2.users.some(x => x.username === user && x.id !== (u ? u.id : ""))) { A.toast("error", "Username sudah dipakai"); return; }
          if (u) {
            const newStatus = ov.querySelector("#gStatus").value;
            const ui = d2.users.findIndex(x => x.id === u.id);
            const prevStatus = d2.users[ui] ? d2.users[ui].status : "";
            d2.users[ui] = { ...d2.users[ui], username: user, name: nama, password: pass, status: newStatus };
            const ti = d2.teacher_profiles.findIndex(x => x.user_id === u.id);
            if (ti >= 0) {
              d2.teacher_profiles[ti] = { ...d2.teacher_profiles[ti], nip: ov.querySelector("#gNip").value.trim(), mapel: ov.querySelector("#gMapel").value, kelas, email: ov.querySelector("#gEmail").value.trim(), no_hp: ov.querySelector("#gHp").value.trim(), nama };
            }
            if (newStatus === "Aktif" && prevStatus !== "Aktif" && ti >= 0) {
              d2.notifications.unshift({
                id: uid("ntf-"), teacher_id: d2.teacher_profiles[ti].id, type: "system",
                title: "Akun guru disetujui",
                message: `Selamat, akun "${nama}" telah disetujui dan aktif. Kamu sudah bisa mengakses Portal Guru.`,
                is_read: false, created_at: new Date().toISOString()
              });
            }
            logAction("Ubah", "Guru", `Update ${nama}`);
          } else {
            const newU = { id: uid("usr-"), username: user, password: pass, role: "guru", status: ov.querySelector("#gStatus").value, name: nama };
            d2.users.push(newU);
            d2.teacher_profiles.push({ id: uid("tch-"), user_id: newU.id, nip: ov.querySelector("#gNip").value.trim(), nama, mapel: ov.querySelector("#gMapel").value, kelas, email: ov.querySelector("#gEmail").value.trim(), no_hp: ov.querySelector("#gHp").value.trim(), foto: "" });
            logAction("Tambah", "Guru", `Tambah ${nama}`);
          }
          saveDB(d2); ov.close(); renderGuru();
          A.toast("success", "Data guru disimpan");
        };
      }
    });
  }

  function deleteGuru(userId) {
    const dbx = db();
    const u = dbx.users.find(x => x.id === userId);
    if (!u) return;
    const t = dbx.teacher_profiles.find(x => x.user_id === u.id);
    A.openModal("Hapus Akun Guru", `
      <div class="logout-box">
        <div class="logout-avatar glass" style="width:64px;height:64px;background:linear-gradient(135deg,var(--danger-soft),#fff7f7);color:var(--danger);">${ICONS.trash}</div>
        <p class="logout-title">Hapus akun <b>${esc(u.name)}</b>?</p>
        <p class="logout-sub">Akun guru, profil, usulan, dan rekomendasi ${u.name} akan dihapus dari sistem. Riwayat transaksi perpustakaan tetap aman.</p>
        <div class="flex gap-12">
          <button class="btn btn-outline btn-sm" id="dgNo" type="button" style="flex:1;justify-content:center;">Batal</button>
          <button class="btn btn-danger btn-sm" id="dgYes" type="button" style="flex:1;justify-content:center;">Hapus Akun</button>
        </div>
      </div>`, {
      onOpen: (ov) => {
        ov.querySelector("#dgNo").onclick = ov.close;
        ov.querySelector("#dgYes").onclick = () => {
          const d2 = db();
          d2.users = d2.users.filter(x => x.id !== u.id);
          if (t) {
            d2.teacher_profiles = d2.teacher_profiles.filter(x => x.id !== t.id);
            d2.book_requests = d2.book_requests.filter(x => x.teacher_id !== t.id);
            d2.recommendations = d2.recommendations.filter(x => x.teacher_id !== t.id);
          }
          saveDB(d2); ov.close();
          logAction("Hapus", "Guru", `Hapus akun ${u.name}`);
          A.toast("success", "Akun guru dihapus");
          renderGuru();
        };
      }
    });
  }

  /* ================= PEMINJAMAN ================= */
  function renderPeminjaman() {
    const dbx = db();
    const requests = dbx.loans.filter(l => l.status === "requested").sort((a, b) => new Date(a.loan_date) - new Date(b.loan_date));
    const actives = dbx.loans.filter(l => ["active", "overdue"].includes(l.status)).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    const reqHtml = requests.length ? requests.map(l => {
      const b = bookById(l.book_id); const std = studentById(l.student_id);
      return `
      <div class="loan-item">
        ${b.cover ? `<img class="mini-cover" src="${esc(b.cover)}">` : `<div class="mini-cover flex items-center justify-center" style="font-weight:700;color:var(--primary);">${esc(b.kode)}</div>`}
        <div class="info"><b>${esc(b.judul)}</b><span>${esc(std.nama)} • ${esc(std.kelas)} ${esc(std.jurusan)}</span><span>${esc(b.penulis)} • Ajukan ${fmtDate(l.loan_date)} → Jatuh tempo ${fmtDate(l.due_date)}</span></div>
        <span class="status-pill pill-pending">Menunggu</span>
        <div class="td-actions">
          <button class="action-btn green" title="Setujui" data-apr="${l.id}">${ICONS.check}</button>
          <button class="action-btn red" title="Tolak" data-rej="${l.id}">${ICONS.x}</button>
        </div>
      </div>`;
    }).join("") : A.emptyState("✅", "Tidak ada permintaan", "Permintaan pinjam siswa akan muncul di sini untuk disetujui.");

    const activeHtml = actives.length ? `
      <div class="table-wrap">
        <table class="table table-cards">
          <thead><tr><th>Buku</th><th>Siswa</th><th>Pinjam</th><th>Jatuh Tempo</th><th>Status</th><th style="text-align:right;">Aksi</th></tr></thead>
          <tbody>
            ${actives.map(l => {
              const b = bookById(l.book_id); const std = studentById(l.student_id);
              return `<tr class="${l.status === "overdue" ? "row-overdue" : ""}">
                <td data-label="Buku"><div class="td-cell">${coverThumb(b)}<div><div class="td-title">${esc(b ? b.judul : "-")}</div><div class="sub">${esc(b ? b.penulis : "")}</div></div></div></td>
                <td data-label="Siswa"><div class="td-cell">${avatarMini(std ? std.nama : "-")}<div><div class="td-title">${esc(std ? std.nama : "-")}</div><div class="sub">${esc(std ? std.kelas + " " + std.jurusan : "")}</div></div></div></td>
                <td data-label="Pinjam">${fmtDate(l.loan_date)}</td>
                <td data-label="Jatuh Tempo">${fmtDate(l.due_date)}</td>
                <td data-label="Status">${statusPill(l)}</td>
                <td data-label="Aksi"><div class="cell-actions"><button class="btn btn-success btn-sm" data-ret="${l.id}">Terima Kembali</button></div></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>` : A.emptyState("📚", "Tidak ada pinjaman aktif", "Belum ada siswa yang meminjam buku.");

    const html = `
      <div class="page-head">
        <h1>Peminjaman</h1>
        <p>Verifikasi permintaan pinjam dan pantau pinjaman aktif siswa.</p>
      </div>
      <div class="section">
        <div class="section-head"><h3>Permintaan Menunggu Persetujuan</h3><span class="status-pill pill-pending">${requests.length} menunggu</span></div>
        ${reqHtml}
      </div>
      <div class="section">
        <div class="section-head"><h3>Pinjaman Aktif</h3><span class="status-pill pill-active">${actives.length} berjalan</span></div>
        ${activeHtml}
      </div>`;

    render(html);
    document.querySelectorAll("[data-apr]").forEach(b => b.onclick = () => approveLoan(b.dataset.apr));
    document.querySelectorAll("[data-rej]").forEach(b => b.onclick = () => rejectLoan(b.dataset.rej));
    document.querySelectorAll("[data-ret]").forEach(b => b.onclick = () => returnForm(b.dataset.ret));
  }

  function approveLoan(loanId) {
    const dbx = db(); const l = dbx.loans.find(x => x.id === loanId);
    const b = bookById(l.book_id);
    if (b.available <= 0) { A.toast("error", "Stok habis", "Buku sedang dipinjam semua."); return; }
    A.confirmDialog("Setujui Peminjaman", `Setujui peminjaman <b>"${esc(b.judul)}"</b> oleh <b>${esc(studentById(l.student_id).nama)}</b>? Stok tersedia akan berkurang.`, () => {
      const d2 = db(); const li = d2.loans.findIndex(x => x.id === loanId);
      d2.loans[li].status = "active";
      d2.loans[li].processed_by = session().user_id;
      const bi = d2.books.findIndex(x => x.id === b.id);
      d2.books[bi].available -= 1; d2.books[bi].borrowed += 1;
      saveDB(d2); logAction("Setujui", "Peminjaman", `${l.loan_code} ${b.judul} -> ${studentById(l.student_id).nama}`);
      A.toast("success", "Peminjaman disetujui", "Stok buku diperbarui.");
      renderPeminjaman();
    }, { yesLabel: "Setujui" });
  }

  function rejectLoan(loanId) {
    const dbx = db(); const l = dbx.loans.find(x => x.id === loanId);
    const b = bookById(l.book_id);
    A.confirmDialog("Tolak Peminjaman", `Tolak permintaan <b>"${esc(b.judul)}"</b> oleh <b>${esc(studentById(l.student_id).nama)}</b>?`, () => {
      const d2 = db(); const li = d2.loans.findIndex(x => x.id === loanId);
      d2.loans[li].status = "rejected";
      d2.loans[li].processed_by = session().user_id;
      saveDB(d2); logAction("Tolak", "Peminjaman", `${l.loan_code} ${b.judul}`);
      A.toast("info", "Permintaan ditolak");
      renderPeminjaman();
    }, { danger: true, yesLabel: "Tolak" });
  }

  /* ================= PENGEMBALIAN ================= */
  function renderPengembalian() {
    const dbx = db();
    const overdue = dbx.loans.filter(l => l.status === "overdue").sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    const actives = dbx.loans.filter(l => l.status === "active").sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    const makeRows = (list) => list.length ? list.map(l => {
      const b = bookById(l.book_id); const std = studentById(l.student_id);
      return `
      <div class="loan-item">
        ${b.cover ? `<img class="mini-cover" src="${esc(b.cover)}">` : `<div class="mini-cover flex items-center justify-center" style="font-weight:700;color:var(--primary);">${esc(b.kode)}</div>`}
        <div class="info"><b>${esc(b.judul)}</b><span>${esc(std.nama)} • ${esc(std.kelas)} ${esc(std.jurusan)}</span><span>Pinjam ${fmtDate(l.loan_date)} • Jatuh tempo ${fmtDate(l.due_date)}</span></div>
        <div style="text-align:right;">
          <span class="status-pill ${l.status === "overdue" ? "pill-overdue" : "pill-active"}">${l.status === "overdue" ? "Terlambat" : "Aktif"}</span>
          <div><button class="btn btn-success btn-sm mt-8" data-ret="${l.id}">Verifikasi Kembali</button></div>
        </div>
      </div>`;
    }).join("") : A.emptyState("🎉", "Tidak ada buku untuk dikembalikan", "Semua buku sudah kembali ke rak.");

    const html = `
      <div class="page-head">
        <h1>Pengembalian</h1>
        <p>Verifikasi buku yang dikembalikan siswa dan catat kondisinya.</p>
      </div>
      <div class="section">
        <div class="section-head"><h3>Buku Terlambat</h3><span class="status-pill pill-overdue">${overdue.length} buku</span></div>
        ${makeRows(overdue)}
      </div>
      <div class="section">
        <div class="section-head"><h3>Buku Aktif (Belum Jatuh Tempo)</h3><span class="status-pill pill-active">${actives.length} buku</span></div>
        ${makeRows(actives)}
      </div>`;

    render(html);
    document.querySelectorAll("[data-ret]").forEach(b => b.onclick = () => returnForm(b.dataset.ret));
  }

  function returnForm(loanId) {
    const dbx = db(); const l = dbx.loans.find(x => x.id === loanId);
    const b = bookById(l.book_id); const std = studentById(l.student_id);
    const late = new Date(l.due_date).getTime() < Date.now();
    const daysLate = Math.max(0, Math.ceil((Date.now() - new Date(l.due_date).getTime()) / 86400000));

    A.openModal(`Pengembalian — ${esc(b.kode)}`, `
      <div class="small-card mb-16">
        <b>${esc(b.judul)}</b>
        <p class="muted text-sm mt-8">Dipinjam oleh <b>${esc(std.nama)}</b> (${esc(std.kelas)} ${esc(std.jurusan)})</p>
        <div class="flex justify-between text-sm mt-8">
          <span>Pinjam: <b>${fmtDate(l.loan_date)}</b></span><span>Jatuh Tempo: <b>${fmtDate(l.due_date)}</b></span>
        </div>
        ${late ? `<div class="alert alert-error mt-12">⚠️ Terlambat <b>${daysLate} hari</b> dari jatuh tempo.</div>` : `<div class="alert alert-success mt-12">✅ Dikembalikan sebelum jatuh tempo.</div>`}
      </div>
      <form id="retForm">
        <div class="field"><label>Kondisi Buku Saat Dikembalikan</label>
          <select class="select" id="rKondisi"><option>Baik</option><option>Rusak Ringan</option><option>Rusak</option></select></div>
        <div class="field"><label>Catatan (opsional)</label><input class="input" id="rNote" placeholder="Contoh: sampul sedikit terlipat"></div>
        <div class="flex justify-end gap-12"><button class="btn btn-outline btn-sm" type="button" id="rClose">Batal</button><button class="btn btn-success btn-sm" type="submit">Simpan Pengembalian</button></div>
      </form>`, {
      onOpen: (ov) => {
        ov.querySelector("#rClose").onclick = ov.close;
        ov.querySelector("#retForm").onsubmit = (e) => {
          e.preventDefault();
          const d2 = db(); const li = d2.loans.findIndex(x => x.id === loanId);
          const condIn = ov.querySelector("#rKondisi").value;
          d2.loans[li].status = "returned";
          d2.loans[li].return_date = new Date().toISOString();
          d2.loans[li].condition_in = condIn;
          d2.loans[li].note = ov.querySelector("#rNote").value.trim();
          d2.loans[li].processed_by = session().user_id;
          const bi = d2.books.findIndex(x => x.id === b.id);
          d2.books[bi].available += 1;
          d2.books[bi].borrowed = Math.max(0, d2.books[bi].borrowed - 1);
          if (condIn !== "Baik") d2.books[bi].damaged += 1;
          saveDB(d2); logAction("Verifikasi", "Pengembalian", `${l.loan_code} ${b.judul} kondisi ${condIn}`);
          A.toast("success", "Pengembalian dicatat", "Stok buku bertambah kembali.");
          ov.close(); renderPengembalian();
        };
      }
    });
  }

  /* ================= NOTIFIKASI / PENGUMUMAN ================= */
  function renderNotifikasi() {
    const dbx = db();
    const settings = dbx.settings || {};
    const announces = (settings.announcements || []).slice().reverse();
    const dueNotifs = dbx.notifications.filter(n => n.type === "due" || n.type === "late").slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);

    const html = `
      <div class="page-head flex justify-between items-center flex-wrap gap-8">
        <div><h1>Notifikasi</h1><p>Kelola pengumuman perpustakaan dan kirim pengingat.</p></div>
        <button class="btn" id="newAnn">${ICONS.plus} Buat Pengumuman</button>
      </div>
      <div class="section">
        <div class="section-head"><h3>Pengumuman Perpustakaan</h3><span class="badge badge-accent">${announces.length} aktif</span></div>
        ${announces.length ? announces.map(a => `
          <div class="announce-banner">
            <span style="font-size:18px;">📢</span>
            <div style="flex:1;">
              <b>${esc(a.title)}</b><p>${esc(a.message)}</p>
              <div class="muted text-xs" style="margin-top:4px;">${timeAgo(a.created_at)}</div>
            </div>
            <button class="action-btn red" title="Hapus" data-ann-del="${a.id}">${ICONS.trash}</button>
          </div>`).join("") : A.emptyState("📢", "Belum ada pengumuman", "Buat pengumuman untuk semua siswa.")}
      </div>
      <div class="section">
        <div class="section-head"><h3>Riwayat Notifikasi Siswa</h3></div>
        ${dueNotifs.length ? dueNotifs.map(n => {
          const std = dbx.students.find(x => x.id === n.student_id);
          return `<div class="notif-item">
            <div class="notif-icon">${n.type === "late" ? "🚨" : n.type === "due" ? "⏰" : "💬"}</div>
            <div class="notif-body"><b>${esc(n.title)}</b><p>${esc(n.message)}</p><div class="time">${esc(std ? std.nama : "")} • ${timeAgo(n.created_at)}</div></div>
          </div>`;
        }).join("") : A.emptyState("🔔", "Belum ada notifikasi siswa")}
      </div>`;

    render(html);
    document.getElementById("newAnn").onclick = () => announcementForm();
    document.querySelectorAll("[data-ann-del]").forEach(b => b.onclick = () => {
      A.confirmDialog("Hapus Pengumuman", "Hapus pengumuman ini?", () => {
        const d2 = db();
        d2.settings.announcements = (d2.settings.announcements || []).filter(a => a.id !== b.dataset.annDel);
        saveDB(d2); logAction("Hapus", "Pengumuman", "Hapus pengumuman");
        A.toast("success", "Pengumuman dihapus"); renderNotifikasi();
      }, { danger: true });
    });
  }

  function announcementForm() {
    A.openModal("Buat Pengumuman", `
      <form id="annForm" class="mt-8">
        <div class="field"><label>Judul *</label><input class="input" id="aTitle" placeholder="Contoh: Jam layanan libur"></div>
        <div class="field"><label>Isi Pengumuman *</label><textarea class="textarea" id="aMsg" placeholder="Tulis detail pengumuman..."></textarea></div>
        <div class="flex justify-end gap-12"><button class="btn btn-outline btn-sm" type="button" id="aClose">Batal</button><button class="btn btn-sm" type="submit">Terbitkan</button></div>
      </form>`, {
      onOpen: (ov) => {
        ov.querySelector("#aClose").onclick = ov.close;
        ov.querySelector("#annForm").onsubmit = (e) => {
          e.preventDefault();
          const title = ov.querySelector("#aTitle").value.trim();
          const msg = ov.querySelector("#aMsg").value.trim();
          if (!title || !msg) { A.toast("warning", "Lengkapi pengumuman"); return; }
          const d2 = db();
          d2.settings.announcements = d2.settings.announcements || [];
          d2.settings.announcements.push({ id: uid("an-"), title, message: msg, created_at: new Date().toISOString() });
          saveDB(d2); logAction("Tambah", "Pengumuman", title);
          A.toast("success", "Pengumuman diterbitkan"); ov.close(); renderNotifikasi();
        };
      }
    });
  }

  /* ================= USULAN GURU ================= */
  function renderUsulanGuru() {
    const dbx = db();
    const requests = (dbx.book_requests || []).slice().sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    const teachers = dbx.teacher_profiles || [];
    const teacherName = id => (teachers.find(t => t.id === id) || {}).nama || "Guru";
    const statusMap = {
      pending: ["Menunggu", "warning"],
      approved: ["Disetujui", "success"],
      rejected: ["Ditolak", "danger"]
    };

    render(`
      <div class="page-head">
        <div><h1>Usulan Buku dari Guru</h1><p>Review karya guru dan rekomendasi bacaan sebelum ditampilkan di SIPUS.</p></div>
      </div>
      <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-bottom:20px;">
        ${statCard("orange", ICONS.clock, requests.filter(r=>r.status==="pending").length, "Menunggu Review", "Perlu ditindaklanjuti")}
        ${statCard("green", ICONS.check, requests.filter(r=>r.status==="approved").length, "Disetujui", "Dipublikasikan")}
        ${statCard("red", ICONS.x, requests.filter(r=>r.status==="rejected").length, "Ditolak", "Dikembalikan ke guru")}
      </div>
      <div class="grid" style="gap:14px;">
        ${requests.map(r => {
          const [label, type] = statusMap[r.status] || [r.status, "neutral"];
          const isOwn = r.type === "karya_sendiri";
          return `<div class="card request-card ${r.status}">
            ${accentBar(type === "warning" ? "var(--warning)" : type === "success" ? "var(--success)" : "var(--danger)")}
            <div class="flex justify-between items-center gap-12 flex-wrap">
              <div>
                <div class="role-pill">${isOwn ? "✍️ Karya Sendiri" : "📚 Rekomendasi Buku"}</div>
                <h3 style="margin-top:9px;font-size:18px;">${esc(r.title)}</h3>
                <p class="muted text-sm">${esc(r.author || "-")} • ${esc(r.publisher || "Penerbit belum diisi")} • ${r.year || "-"}</p>
              </div>
              <span class="badge badge-${type}">${label}</span>
            </div>
            <div class="grid mt-16" style="grid-template-columns:100px 1fr;gap:16px;">
              <img class="cover-preview usulan-cover" src="${esc(r.cover || "assets/books/book-fallback.svg")}" alt="Kover usulan">
              <div>
                <div class="small-card mb-12"><b>Guru:</b> ${esc(teacherName(r.teacher_id))} &nbsp;•&nbsp; <b>Target:</b> ${esc(r.target_class || "-")}</div>
                <p class="text-sm"><b>Alasan:</b> ${esc(r.reason || "-")}</p>
                ${r.review_note ? `<p class="text-sm muted mt-8"><b>Catatan admin:</b> ${esc(r.review_note)}</p>` : ""}
                ${r.status === "pending" ? `<div class="flex gap-8 mt-16 flex-wrap">
                  <button class="btn btn-success btn-sm" data-approve="${r.id}">${ICONS.check} Setujui</button>
                  <button class="btn btn-danger btn-sm" data-reject="${r.id}">${ICONS.x} Tolak</button>
                </div>` : ""}
              </div>
            </div>
          </div>`;
        }).join("") || `<div class="card center muted">Belum ada usulan dari guru.</div>`}
      </div>`);

    document.querySelectorAll("[data-approve]").forEach(btn => btn.onclick = () => reviewRequest(btn.dataset.approve, "approved"));
    document.querySelectorAll("[data-reject]").forEach(btn => btn.onclick = () => reviewRequest(btn.dataset.reject, "rejected"));
  }

  function reviewRequest(id, status) {
    const dbx = db();
    const req = (dbx.book_requests || []).find(x => x.id === id);
    if (!req) return;
    const label = status === "approved" ? "menyetujui" : "menolak";
    A.openModal(status === "approved" ? "Setujui Usulan" : "Tolak Usulan", `
      <form id="reviewForm">
        <div class="alert ${status === "approved" ? "alert-success" : "alert-error"}">${status === "approved" ? "Usulan akan dipublikasikan." : "Usulan akan dikembalikan kepada guru sebagai ditolak."}</div>
        <div class="field"><label>Catatan Admin</label><textarea class="textarea" id="reviewNote" placeholder="Tambahkan catatan untuk guru..."></textarea></div>
        <div class="flex justify-end gap-12"><button class="btn btn-outline btn-sm" type="button" id="reviewClose">Batal</button><button class="btn btn-sm ${status === "rejected" ? "btn-danger" : ""}" type="submit">${status === "approved" ? "Setujui & Publikasikan" : "Tolak Usulan"}</button></div>
      </form>`, {
      onOpen: ov => {
        ov.querySelector("#reviewClose").onclick = ov.close;
        ov.querySelector("#reviewForm").onsubmit = e => {
          e.preventDefault();
          req.status = status;
          req.reviewed_at = new Date().toISOString();
          req.review_note = ov.querySelector("#reviewNote").value.trim();
          if (status === "approved" && req.type === "karya_sendiri") {
            const exists = dbx.books.some(b => (req.isbn && b.isbn === req.isbn) || b.judul.toLowerCase() === req.title.toLowerCase());
            if (!exists) {
              const nextCode = "BK" + String(dbx.books.length + 1).padStart(3, "0");
              dbx.books.push({
                id: uid("bk-"), kode: nextCode, isbn: req.isbn || "", judul: req.title, penulis: req.author || teacherNameFromReq(dbx, req),
                penerbit: req.publisher || "SIPUS Sekolah", tahun: req.year || new Date().getFullYear(), kategori_id: req.category_id || "cat-01",
                sinopsis: req.reason || "Buku karya guru yang disetujui admin.", rak: "E-01",
                cover: req.cover || "", total: 1, available: 1, borrowed: 0, damaged: 0, lost: 0, kondisi: "Baik"
              });
            }
          }
          dbx.notifications.unshift({
            id: uid("ntf-"), teacher_id: req.teacher_id, type: "system",
            title: status === "approved" ? "Usulan buku disetujui" : "Usulan buku ditolak",
            message: `${status === "approved" ? "Usulan berjudul" : "Maaf, usulan berjudul"} "${req.title}" ${status === "approved" ? "telah disetujui dan dipublikasikan ke katalog." : "tidak disetujui admin."}${req.review_note ? ` Catatan admin: ${req.review_note}` : ""}`,
            is_read: false, created_at: new Date().toISOString()
          });
          saveDB(dbx);
          A.refreshNotifBadges();
          logAction(status === "approved" ? "Setujui" : "Tolak", "Usulan Guru", `${status === "approved" ? "Menyetujui" : "Menolak"} ${req.title}`);
          ov.close(); A.toast("success", status === "approved" ? "Usulan disetujui" : "Usulan ditolak"); renderUsulanGuru();
        };
      }
    });
  }

  function teacherNameFromReq(dbx, req) {
    const t = (dbx.teacher_profiles || []).find(x => x.id === req.teacher_id);
    return t ? t.nama : "Guru";
  }

  /* ================= LAPORAN ================= */
  function renderLaporan() {
    const dbx = db();
    const loans = dbx.loans;
    const books = dbx.books;
    const settings = dbx.settings || {};

    const returned = loans.filter(l => l.status === "returned");
    const active = loans.filter(l => ["active", "overdue"].includes(l.status));
    const overdue = loans.filter(l => l.status === "overdue");
    const borrowedThisMonth = loans.filter(l => (l.loan_date || "").slice(0, 7) === new Date().toISOString().slice(0, 7)).length;

    const topBooks = books.slice().sort((a, b) => b.borrowed - a.borrowed).slice(0, 6);
    const maxBorrow = Math.max(1, ...topBooks.map(b => b.borrowed));
    const catDist = dbx.categories.map(c => ({ name: c.name, count: books.filter(b => b.kategori_id === c.id).length })).sort((a, b) => b.count - a.count).slice(0, 6);
    const maxCat = Math.max(1, ...catDist.map(c => c.count));

    const activeStudents = dbx.students.map(s => {
      const n = dbx.loans.filter(l => l.student_id === s.id && l.status === "returned").length;
      return { s, n };
    }).sort((a, b) => b.n - a.n).slice(0, 5);
    const maxRead = Math.max(1, ...activeStudents.map(x => x.n));

    const html = `
      <div class="page-head flex justify-between items-center flex-wrap gap-8">
        <div><h1>Laporan Perpustakaan</h1><p>Rekap statistik peminjaman dan koleksi. Sumber: per-${fmtDate(new Date().toISOString())}</p></div>
        <button class="btn btn-outline" id="btnExport">${ICONS.report} Export CSV</button>
      </div>

      <div class="stat-grid">
        ${statCard("blue", ICONS.loan, loans.length, "Total Transaksi", "Seluruh histori")}
        ${statCard("green", ICONS.check, returned.length, "Selesai", "Dikembalikan tepat waktu")}
        ${statCard("orange", ICONS.box, active.length, "Sedang Berjalan", "Aktif + terlambat")}
        ${statCard("red", ICONS.alert, overdue.length, "Terlambat", "Perlu tindakan")}
      </div>

      <div class="grid admin-grid-2" id="repGrid">
        <div class="section">
          <div class="card">
            <h3 style="font-size:15px;font-weight:800;margin-bottom:12px;">Buku Paling Sering Dipinjam</h3>
            <div class="chart-bar-wrap">
              ${topBooks.map(b => `<div class="chart-bar-row">
                <span class="cb-label" title="${esc(b.judul)}">${esc(b.judul)}</span>
                <div class="cb-track ${b.borrowed === 0 ? "empty" : ""}"><div class="cb-fill" style="width:${Math.round(b.borrowed / maxBorrow * 100)}%;">${b.borrowed}×</div></div>
              </div>`).join("")}
            </div>
          </div>
        </div>
        <div class="section">
          <div class="card">
            <h3 style="font-size:15px;font-weight:800;margin-bottom:12px;">Koleksi per Kategori</h3>
            <div class="chart-bar-wrap">
              ${catDist.map(c => `<div class="chart-bar-row">
                <span class="cb-label">${esc(c.name)}</span>
                <div class="cb-track ${c.count === 0 ? "empty" : ""}" style="--h:26px;"><div class="cb-fill" style="background:var(--success);width:${Math.round(c.count / maxCat * 100)}%;">${c.count}</div></div>
              </div>`).join("")}
            </div>
          </div>
        </div>
        <div class="section">
          <div class="card">
            <h3 style="font-size:15px;font-weight:800;margin-bottom:12px;">Siswa Paling Aktif Membaca</h3>
            <div class="chart-bar-wrap">
              ${activeStudents.map(x => `<div class="chart-bar-row">
                <span class="cb-label">${esc(x.s.nama)}</span>
                <div class="cb-track ${x.n === 0 ? "empty" : ""}"><div class="cb-fill" style="background:var(--warning);width:${Math.round(x.n / maxRead * 100)}%;">${x.n}×</div></div>
              </div>`).join("")}
            </div>
          </div>
        </div>
        <div class="section">
          <div class="card">
            <h3 style="font-size:15px;font-weight:800;margin-bottom:12px;">Ringkasan Mutasi</h3>
            <div class="meta-row"><b>Bulan berjalan</b><span>${borrowedThisMonth} peminjaman baru</span></div>
            <div class="meta-row"><b>Rata-rata aktif</b><span>${active.length} pinjaman berjalan</span></div>
            <div class="meta-row"><b>Tingkat keterlambatan</b><span>${loans.length ? Math.round(overdue.length / Math.max(1, loans.length) * 100) : 0}% dari total transaksi</span></div>
            <div class="meta-row"><b>Koleksi</b><span>${books.length} judul / ${books.reduce((a, b) => a + b.total, 0)} eksemplar</span></div>
            <div class="meta-row"><b>Siswa terdaftar</b><span>${dbx.students.length} anggota</span></div>
            <div class="meta-row"><b>Jam layanan</b><span>${esc(settings.library_hours || "-")}</span></div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head"><h3>Rekap Transaksi Terlambat</h3></div>
        <div class="table-wrap">
          <table class="table table-cards">
            <thead><tr><th>Kode</th><th>Buku</th><th>Siswa</th><th>Jatuh Tempo</th><th>Hari Terlambat</th></tr></thead>
            <tbody>
              ${overdue.length ? overdue.map(l => {
                const b = bookById(l.book_id); const std = studentById(l.student_id);
                const days = Math.max(1, Math.ceil((Date.now() - new Date(l.due_date).getTime()) / 86400000));
                return `<tr><td data-label="Kode" class="text-xs">${esc(l.loan_code)}</td><td data-label="Buku"><div class="td-cell">${coverThumb(b)}<div><div class="td-title">${esc(b.judul)}</div><div class="sub">${esc(b.penulis)}</div></div></div></td><td data-label="Siswa"><div class="td-cell">${avatarMini(std ? std.nama : "-")}<div><div class="td-title">${esc(std.nama)}</div><div class="sub">${esc(std.kelas)} ${esc(std.jurusan)}</div></div></div></td><td data-label="Jatuh Tempo">${fmtDate(l.due_date)}</td><td data-label="Hari Terlambat"><span class="status-pill pill-overdue">${days} hari terlambat</span></td></tr>`;
              }).join("") : `<tr class="row-empty"><td colspan="5">Tidak ada transaksi terlambat. 🎉</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;

    render(html);
    if (window.innerWidth <= 900) { const g = document.getElementById("repGrid"); if (g) g.classList.add("single-col"); }
    document.getElementById("btnExport").onclick = () => exportCSV();
  }

  function exportCSV() {
    const dbx = db();
    const rows = [["Kode", "Judul", "Penulis", "Kategori", "Total", "Tersedia", "Dipinjam", "Status"]];
    dbx.books.forEach(b => {
      rows.push([b.kode, b.judul, b.penulis, categoryName(b.kategori_id), b.total, b.available, b.borrowed, bookStatus(b).label]);
    });
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `laporan-sipus-${todayStr()}.csv`;
    link.click();
    A.toast("success", "Laporan diunduh", "File CSV siap dibuka di Excel.");
  }

  /* ================= AUDIT ================= */
  function renderAudit() {
    const dbx = db();
    const logs = dbx.audit_logs.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const html = `
      <div class="page-head">
        <h1>Audit Aktivitas</h1>
        <p>Catatan siapa yang mengubah buku, stok, siswa, atau transaksi.</p>
      </div>
      <div class="table-wrap">
        <table class="table table-cards">
          <thead><tr><th>Waktu</th><th>Petugas</th><th>Aksi</th><th>Modul</th><th>Detail</th></tr></thead>
          <tbody>
            ${logs.map(au => {
              const u = dbx.users.find(x => x.id === au.user_id);
              const badgeType = au.action === "Tambah" ? "success" : au.action === "Hapus" || au.action === "Tolak" ? "danger" : au.action === "Login" ? "neutral" : "primary";
              return `<tr>
                <td data-label="Waktu" class="text-xs">${fmtDate(au.created_at)}</td>
                <td data-label="Petugas"><div class="td-cell">${avatarMini(u ? u.name : "Sistem")}<div><div class="td-title">${esc(u ? u.name : "Sistem")}</div><div class="sub">${esc(u ? (u.role === "admin" ? "Admin" : "Siswa") : "")}</div></div></div></td>
                <td data-label="Aksi"><span class="badge badge-${badgeType}">${esc(au.action)}</span></td>
                <td data-label="Modul">${esc(au.module)}</td>
                <td data-label="Detail" class="text-sm">${esc(au.detail)}</td>
              </tr>`;
            }).join("")}
            ${!logs.length ? `<tr class="row-empty"><td colspan="5">Belum ada aktivitas tercatat.</td></tr>` : ""}
          </tbody>
        </table>
      </div>`;

    render(html);
  }

  /* ================= PENGATURAN ================= */
  function renderPengaturan() {
    const dbx = db();
    const s = dbx.settings || {};
    const html = `
      <div class="setting-hero">
        <div class="flex items-center gap-12 flex-wrap">
          <div class="sh-ico">${ICONS.settings}</div>
          <div>
            <h1 style="font-size:22px;font-weight:800;">Pengaturan Perpustakaan</h1>
            <p style="font-size:14px;opacity:.85;">Konfigurasi profil sekolah dan aturan peminjaman SIPUS.</p>
          </div>
        </div>
        <div class="flex gap-8 flex-wrap" style="position:relative;z-index:2;">
          <span class="hero-chip">📚 ${dbx.books.length} buku</span>
          <span class="hero-chip">👦 ${dbx.students.length} siswa</span>
          <span class="hero-chip">🔁 ${dbx.loans.length} transaksi</span>
        </div>
      </div>

      <div class="setting-tabs" id="setTabs">
        <button class="st-tab active" type="button" data-st="sekolah">${ICONS.user} Profil Sekolah</button>
        <button class="st-tab" type="button" data-st="aturan">${ICONS.clock} Aturan Peminjaman</button>
        <button class="st-tab" type="button" data-st="data">${ICONS.trash} Data Demo</button>
      </div>

      <form id="setForm">
        <div class="setting-panel active" data-stp="sekolah">
          <div class="card">
            <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;">
              <div class="field"><label>Nama Sekolah</label><input class="input" id="pSchool" value="${esc(s.school_name || "")}"></div>
              <div class="field"><label>Slogan</label><input class="input" id="pTagline" value="${esc(s.tagline || "")}"></div>
              <div class="field"><label>Alamat</label><input class="input" id="pAddress" value="${esc(s.address || "")}"></div>
              <div class="field"><label>Kontak Perpustakaan</label><input class="input" id="pContact" value="${esc(s.contact || "")}"></div>
              <div class="field"><label>Jam Layanan</label><input class="input" id="pHours" value="${esc(s.library_hours || "")}"></div>
              <div class="field"><label>Huruf Logo</label><input class="input" id="pLogo" maxlength="1" value="${esc(s.logo_letter || "S")}"></div>
            </div>
            <div class="field">
              <label>Logo / Foto Perpustakaan</label>
              <div class="logo-photo-row">
                <img class="logo-photo-preview" id="logoPrev" src="${esc(s.logo || "assets/sipus-logo.png")}" alt="Logo perpustakaan" title="Klik untuk memperbesar">
                <div class="logo-photo-actions">
                  <button class="btn btn-outline btn-sm" type="button" id="btnLogo">Ganti Foto...</button>
                  <button class="btn btn-outline btn-sm" type="button" id="btnLogoRemove" style="color:var(--danger);border-color:var(--danger);" ${s.logo ? "" : "hidden"}>Hapus Foto</button>
                  <p class="muted text-xs" style="margin-top:7px;color:var(--text-muted);">Format PNG/JPG/WebP. Klik foto untuk melihat ukuran penuh.</p>
                </div>
                <input type="file" id="logoFile" accept="image/png,image/jpeg,image/webp,image/gif" hidden>
              </div>
            </div>
          </div>
        </div>

        <div class="setting-panel" data-stp="aturan">
          <div class="card">
            <h3 style="font-size:15px;font-weight:800;margin-bottom:14px;">Aturan Peminjaman</h3>
            <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;">
              <div class="field"><label>Batas Buku / Siswa</label><input class="input" type="number" id="pLimit" value="${s.loan_limit || 3}" min="1"></div>
              <div class="field"><label>Lama Pinjam (hari)</label><input class="input" type="number" id="pDuration" value="${s.loan_duration || 7}" min="1"></div>
            </div>
          </div>
        </div>

        <div class="setting-panel" data-stp="data">
          <div class="card">
            <div class="flex justify-between items-center mb-16 flex-wrap gap-8">
              <div>
                <h3 style="font-size:15px;font-weight:800;">Data Demo</h3>
                <p class="muted text-sm">Mengembalikan seluruh data ke kondisi awal demo (buku, siswa, transaksi, pengaturan). Data yang kamu buat akan hilang.</p>
              </div>
              <button class="btn btn-outline btn-sm" type="button" id="btnReset" style="color:var(--danger);border-color:var(--danger);">Reset Data</button>
            </div>
            <div class="small-card">
              <b class="text-sm">Statistik saat ini</b>
              <div class="flex gap-12 mt-8 text-sm flex-wrap">
                <span>📚 ${dbx.books.length} buku</span>
                <span>👦 ${dbx.students.length} siswa</span>
                <span>🔁 ${dbx.loans.length} transaksi</span>
              </div>
            </div>
          </div>
        </div>

        <div class="mb-16">
          <button class="btn" type="submit">💾 Simpan Pengaturan</button>
        </div>
      </form>`;

    render(html);
    document.querySelectorAll(".st-tab").forEach(btn => btn.onclick = () => {
      document.querySelectorAll(".st-tab").forEach(x => x.classList.toggle("active", x === btn));
      document.querySelectorAll(".setting-panel").forEach(p => p.classList.toggle("active", p.dataset.stp === btn.dataset.st));
    });

    let logoData = s.logo || "";
    const logoPrev = document.getElementById("logoPrev");
    const logoFile = document.getElementById("logoFile");
    const btnLogo = document.getElementById("btnLogo");
    const btnLogoRemove = document.getElementById("btnLogoRemove");
    if (logoPrev) logoPrev.onclick = () => {
      A.openModal("Logo Perpustakaan", `<div style="text-align:center;"><img class="logo-modal-img" src="${esc(logoData || "assets/sipus-logo.png")}" alt="Logo perpustakaan"></div>`);
    };
    if (btnLogo) btnLogo.onclick = () => { if (logoFile) logoFile.click(); };
    if (logoFile) logoFile.onchange = () => {
      const f = logoFile.files && logoFile.files[0];
      if (!f) return;
      if (!/^image\/(png|jpe?g|webp|gif)$/i.test(f.type)) { A.toast("error", "Format tidak didukung", "Gunakan PNG, JPG, atau WebP."); return; }
      const rd = new FileReader();
      rd.onload = () => {
        logoData = String(rd.result || "");
        logoPrev.src = logoData;
        if (btnLogoRemove) btnLogoRemove.hidden = false;
      };
      rd.readAsDataURL(f);
    };
    if (btnLogoRemove) btnLogoRemove.onclick = () => {
      logoData = "";
      logoPrev.src = "assets/sipus-logo.png";
      btnLogoRemove.hidden = true;
    };

    document.getElementById("setForm").onsubmit = (e) => {
      e.preventDefault();
      const d2 = db();
      d2.settings = {
        ...(d2.settings || {}),
        school_name: el("pSchool").value.trim(),
        tagline: el("pTagline").value.trim(),
        address: el("pAddress").value.trim(),
        contact: el("pContact").value.trim(),
        library_hours: el("pHours").value.trim(),
        logo_letter: el("pLogo").value.trim().toUpperCase() || "S",
        logo: logoData,
        loan_limit: parseInt(el("pLimit").value) || 3,
        loan_duration: parseInt(el("pDuration").value) || 7
      };
      saveDB(d2); logAction("Ubah", "Pengaturan", "Update pengaturan perpustakaan");
      A.toast("success", "Pengaturan disimpan");
      document.title = `SIPUS — ${d2.settings.school_name}`;
    };

    document.getElementById("btnReset").onclick = () => {
      A.confirmDialog("Reset Data Demo", "Kembalikan semua data ke kondisi awal demo? Seluruh perubahan akan hilang.", () => {
        S.resetDB();
        A.clearSession();
        A.toast("success", "Data direset", "Mengalihkan ke halaman login...");
        setTimeout(() => location.href = "login.html", 1200);
      }, { danger: true, yesLabel: "Ya, Reset" });
    };

    function el(id) { return document.getElementById(id); }
  }

  /* ================= BOOT ================= */
  function boot() {
    if (!A.requireAuth()) return;
    const s = session();
    if (s.role !== "admin") { location.href = "app-student.html"; return; }
    document.body.classList.add("admin-mode");
    S.syncOverdue(db());
    renderLayout();
    renderDashboard();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();