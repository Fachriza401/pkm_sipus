/* ============================================================
   SIPUS — App Core (Auth, router, UI helpers, render helpers)
   ============================================================ */
(function () {
  const { getDB, saveDB, ICONS, esc, fmtDate, fmtDateLong, timeAgo, bookById, categoryName, studentById, bookStatus, loanStatusInfo, uid } = window.SIPUS;

  /* ---------- Session ---------- */
  const SESSION_KEY = "sipus_session";

  function currentUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function setSession(user, remember) {
    const s = { user_id: user.id, role: user.role, name: user.name, username: user.username, login_at: new Date().toISOString() };
    if (remember) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  }

  function getSession() {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }

  function login(username, password) {
    const db = getDB();
    const user = db.users.find(u => u.username === username.trim() && u.password === password);
    if (!user) return { error: "NIS atau password salah." };
    if (user.status !== "Aktif") return { error: "Akun kamu nonaktif. Hubungi admin perpustakaan." };
    const s = { user_id: user.id, role: user.role, name: user.name, username: user.username, login_at: new Date().toISOString() };
    return { user, session: s };
  }

  function requireAuth() {
    const session = getSession();
    if (!session) { location.href = "login.html"; return null; }
    return session;
  }

  function registerStudent(data) {
    const nis = String(data.nis || "").trim();
    const nama = String(data.nama || "").trim();
    const kelas = String(data.kelas || "").trim();
    const jurusan = String(data.jurusan || "").trim();
    const password = String(data.password || "");

    if (!nis || !nama || !kelas || !jurusan) return { error: "Lengkapi semua data wajib (NIS, Nama, Kelas, Jurusan)." };
    if (password.length < 6) return { error: "Password minimal 6 karakter." };

    const db = getDB();
    if (db.users.some(u => u.username === nis)) {
      return { error: "NIS sudah terdaftar. Silakan masuk atau hubungi admin perpustakaan." };
    }

    const user = { id: uid("usr-"), username: nis, password, role: "siswa", status: "Aktif", name: nama };
    db.users.push(user);

    const student = {
      id: uid("std-"), user_id: user.id, nis, nama, kelas, jurusan,
      gender: data.gender || "", kontak: data.kontak || "", email: data.email || "", foto: ""
    };
    db.students.push(student);

    db.notifications.push({
      id: uid("ntf-"), student_id: student.id, type: "system",
      title: "Selamat bergabung di SIPUS", message: "Akun kamu aktif. Jelajahi katalog dan mulai membaca!",
      is_read: false, created_at: new Date().toISOString()
    });

    db.audit_logs.push({
      id: uid("au-"), user_id: user.id, action: "Registrasi", module: "Auth",
      detail: `Siswa baru mendaftar mandiri: ${nama} (${nis})`, created_at: new Date().toISOString()
    });

    saveDB(db);
    return { user, student };
  }

  /* ---------- UI helpers ---------- */
  const toastWrap = () => {
    let w = document.querySelector(".toast-wrap");
    if (!w) { w = document.createElement("div"); w.className = "toast-wrap"; document.body.appendChild(w); }
    return w;
  };

  function toast(type, title, msg) {
    const icons = { success: "✅", error: "⛔", warning: "⚠️", info: "💡" };
    const el = document.createElement("div");
    el.className = `toast glass ${type}`;
    el.innerHTML = `<span class="t-icon">${icons[type] || "💡"}</span><div><b>${esc(title)}</b>${msg ? `<span>${esc(msg)}</span>` : ""}</div><div class="t-progress"></div>`;
    toastWrap().appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 300);
    }, 3300);
  }

  let modalZCounter = 100;

  function openModal(title, bodyHtml, opts) {
    opts = opts || {};
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-head">
          <h3>${esc(title)}</h3>
          <button class="modal-close" type="button">&times;</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
      </div>`;
document.body.appendChild(overlay);
  const raf = window.requestAnimationFrame || function (cb) { return setTimeout(cb, 16); };
  raf(() => overlay.classList.add("show"));
    const close = () => { overlay.classList.remove("show"); setTimeout(() => overlay.remove(), 250); };
    overlay.close = close;
    overlay.querySelector(".modal-close").onclick = close;
    overlay.addEventListener("click", e => { if (e.target === overlay && !opts.keepOpen) close(); });
    if (opts.onOpen) { try { opts.onOpen(overlay); } catch (e) { console.error(e); } }
    return { overlay, close };
  }

  function confirmDialog(title, msg, onYes, opts) {
    opts = opts || {};
    const danger = opts.danger !== false;
    openModal(title, `
      <p style="color:var(--text-muted);font-size:14px;margin-bottom:20px;">${msg}</p>
      <div class="flex gap-12 justify-end">
        <button class="btn btn-outline btn-sm" id="cfNo">Batal</button>
        <button class="btn ${danger ? "btn-danger" : "btn-primary"} btn-sm" id="cfYes">${opts.yesLabel || "Ya, Lanjutkan"}</button>
      </div>`, {
      onOpen: (ov) => {
        ov.querySelector("#cfNo").onclick = ov.close;
        ov.querySelector("#cfYes").onclick = () => { ov.close(); onYes(); };
      }
    });
  }

  function logoutDialog(opts) {
    opts = opts || {};
    const session = getSession();
    const name = opts.name || (session && session.name) || "Pengguna";
    openModal("Keluar dari SIPUS", `
      <div class="logout-box">
        <div class="logout-avatar glass">${ICONS.logout || ""}</div>
        <p class="logout-title">Yakin ingin keluar, ${esc(name)}?</p>
        <p class="logout-sub">${opts.sub || "Sesi akun kamu akan diakhiri dengan aman. Kamu bisa masuk kembali kapan saja."}</p>
        <div class="flex gap-12">
          <button class="btn btn-outline btn-sm" id="lgStay" type="button" style="flex:1;justify-content:center;">Batal</button>
          <button class="btn btn-danger btn-sm" id="lgGo" type="button" style="flex:1;justify-content:center;">Keluar Sekarang</button>
        </div>`, {
      onOpen: (ov) => {
        ov.querySelector("#lgStay").onclick = ov.close;
        ov.querySelector("#lgGo").onclick = () => {
          ov.close();
          document.body.classList.add("page-fade");
          setTimeout(() => {
            if (typeof opts.onConfirm === "function") opts.onConfirm();
            else { clearSession(); location.href = "login.html"; }
          }, 220);
        };
      }
    });
  }

  /* ---------- Sidebar + topbar (shared) ---------- */
  function buildSidebar(items, activeKey, userInfo) {
    const groups = [];
    let lastLabel = null;
    items.forEach(it => {
      if (it.label && it.label !== lastLabel) { groups.push({ label: it.label, items: [] }); lastLabel = it.label; }
      groups[groups.length - 1].items.push(it);
    });

    const settings = getDB().settings || {};
    const schoolName = settings.school_name || "SMA Swasta Pencawan";
    const logo = settings.logo || "assets/sipus-logo.png";
    const logoCls = settings.logo ? "custom-logo" : "default-logo";
    const initials = (userInfo.name || "S").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

    return `
      <aside class="sidebar" id="sidebar">
        <div class="logo-area">
          <div class="sidebar-brand">
            <div class="brand-line">
              <img class="brand-logo brand-logo-image sidebar-brand-image ${logoCls}" src="${esc(logo)}" alt="Logo SIPUS">
              <div class="brand-copy">
                <b>SIPUS</b>
                <span>Sistem Perpustakaan</span>
                <small>${esc(schoolName)}</small>
              </div>
            </div>
          </div>
        </div>
        <nav class="nav">
          ${groups.map(g => `
            <div class="nav-group">
              <div class="nav-group-label">${esc(g.label)}</div>
              ${g.items.map(it => `
                <button class="nav-item ${it.key === activeKey ? "active" : ""}" data-nav="${it.key}">
                  ${ICONS[it.icon] || ""}
                  <span>${esc(it.text)}</span>
                  ${it.badge > 0 ? `<span class="nav-badge">${it.badge}</span>` : ""}
                </button>`).join("")}
            </div>`).join("")}
        </nav>
        <div class="sidebar-foot">
          <div class="sidebar-user">
            <div class="avatar sidebar-user-avatar">${initials}</div>
            <div class="sidebar-user-info">
              <b>${esc(userInfo.name)}</b>
              <span>${esc(userInfo.role)}</span>
            </div>
          </div>
        </div>
      </aside>
      <div class="sidebar-overlay" id="sidebarOverlay"></div>`;
  }

  function getSettingLetter() {
    const db = getDB();
    const s = db.settings || {};
    return (s.logo_letter || "S").slice(0, 1).toUpperCase();
  }

  function buildTopbar(pageSubtitle, unreadCount) {
    const session = getSession();
    if (!session) return "";
    const initials = (session.name || "U").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    const cls = session.role === "admin" ? "App Admin / Pustakawan" :
      session.role === "guru" ? "Portal Guru" : "Portal Siswa";
    return `
      <header class="topbar">
        <div class="topbar-left">
          <button class="icon-circle burger" id="burgerBtn" type="button" title="Sembunyikan/tampilkan menu">${ICONS.menu}</button>
          <img class="topbar-logo" src="assets/sipus-logo.png" alt="Logo SIPUS">
          <div>
            <b style="font-size:15px;">${esc(pageSubtitle)}</b>
            <span class="text-xs muted" style="display:block;">${esc(cls)} • ${fmtDate(new Date().toISOString())}</span>
          </div>
        </div>
        <div class="topbar-search">
          ${ICONS.search}
          <input type="text" placeholder="Cari buku, penulis, ISBN..." id="topSearch" autocomplete="off">
        </div>
        <div class="topbar-right">
          <div class="topbar-notif" id="topNotifWrap">
            <button class="icon-circle" id="topNotifBtn" type="button" title="Notifikasi" aria-expanded="false">
              ${ICONS.bell}
              <span class="dot" id="notifDot" ${unreadCount > 0 ? "" : "hidden"}></span>
              <span class="notif-badge" id="notifBadge" ${unreadCount > 0 ? "" : "hidden"}>${unreadCount > 99 ? "99+" : unreadCount}</span>
            </button>
            <div class="notif-panel" id="topNotifPanel" hidden></div>
          </div>
          <div class="profile-menu-wrap">
            <button class="avatar" id="topAvatarBtn" type="button" aria-expanded="false">${initials}</button>
            <div class="profile-menu" id="profileMenu" hidden></div>
          </div>
        </div>
      </header>`;
  }

  const SIDEBAR_COLLAPSE_KEY = "sipus_sidebar_collapsed";
  const DESKTOP_BREAKPOINT = 992;

  function afterLayout(cfg) {
    // sidebar nav handlers
    document.querySelectorAll(".nav-item[data-nav]").forEach(btn => {
      btn.onclick = () => { go(btn.dataset.nav); };
    });
    const appEl = document.getElementById("app");
    const overlay = document.getElementById("sidebarOverlay");
    const sidebar = document.getElementById("sidebar");
    if (overlay) overlay.onclick = () => { sidebar.classList.remove("open"); overlay.classList.remove("show"); };

    // restore desktop collapsed state after every re-render
    if (appEl && window.innerWidth > DESKTOP_BREAKPOINT && localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1") {
      appEl.classList.add("sidebar-collapsed");
    }

    const burger = document.getElementById("burgerBtn");
    if (burger) burger.onclick = () => {
      if (window.innerWidth > DESKTOP_BREAKPOINT) {
        appEl.classList.toggle("sidebar-collapsed");
        localStorage.setItem(SIDEBAR_COLLAPSE_KEY, appEl.classList.contains("sidebar-collapsed") ? "1" : "0");
      } else {
        sidebar.classList.toggle("open");
        overlay.classList.toggle("show");
      }
    };

    const topNotifBtn = document.getElementById("topNotifBtn");
    if (topNotifBtn && cfg.onNotifDropdown) {
      const closeNotif = () => {
        const p = document.getElementById("topNotifPanel");
        const b = document.getElementById("topNotifBtn");
        if (p && !p.hidden) { p.hidden = true; if (b) b.setAttribute("aria-expanded", "false"); }
      };
      topNotifBtn.onclick = (event) => {
        event.stopPropagation();
        const panel = document.getElementById("topNotifPanel");
        if (!panel) return;
        const open = panel.hidden;
        panel.hidden = !open;
        topNotifBtn.setAttribute("aria-expanded", String(open));
        if (open) {
          try { cfg.onNotifDropdown(panel); }
          catch (err) {
            console.error("Gagal memuat notifikasi:", err);
            panel.innerHTML = `<div class="np-item"><span class="np-icon">${ICONS.bell || ""}</span><div class="np-body"><b>Tidak ada notifikasi</b><p>Terjadi kendala saat memuat notifikasi.</p></div></div>`;
          }
        }
      };
      if (!afterLayout.__notifCloser) {
        afterLayout.__notifCloser = true;
        document.addEventListener("click", (event) => {
          if (!event.target.closest("#topNotifWrap")) closeNotif();
        });
      }
    } else if (topNotifBtn && cfg.onNotif) {
      topNotifBtn.onclick = cfg.onNotif;
    }

    const topAvatarBtn = document.getElementById("topAvatarBtn");
    const profileMenu = document.getElementById("profileMenu");
    if (topAvatarBtn && profileMenu && cfg.profileMenu) {
      profileMenu.innerHTML = cfg.profileMenu.map(item => `<button type="button" data-profile-nav="${item.key}">${ICONS[item.icon] || ""}<span>${item.text}</span></button>`).join("");
      topAvatarBtn.onclick = (event) => {
        event.stopPropagation();
        profileMenu.hidden = !profileMenu.hidden;
        topAvatarBtn.setAttribute("aria-expanded", String(!profileMenu.hidden));
      };
      profileMenu.querySelectorAll("[data-profile-nav]").forEach(button => button.onclick = () => {
        profileMenu.hidden = true;
        go(button.dataset.profileNav);
      });
    } else if (topAvatarBtn && cfg.onAvatar) topAvatarBtn.onclick = cfg.onAvatar;

    document.addEventListener("click", event => {
      if (profileMenu && !profileMenu.hidden && !event.target.closest(".profile-menu-wrap")) profileMenu.hidden = true;
    });

    const topSearch = document.getElementById("topSearch");
    if (topSearch) topSearch.onkeydown = (e) => {
      if (e.key === "Enter" && cfg.onSearch) cfg.onSearch(topSearch.value);
    };
  }

  function go(key) {
    // nav routing per page defined in page scripts
    if (window.__NAV__ && window.__NAV__[key]) {
      window.__NAV__[key]();
    }
  }

  let __shellScroll = 0;

  function setAppShell(html) {
    const sb = document.getElementById("sidebar");
    __shellScroll = sb ? sb.scrollTop : 0;
    const app = document.getElementById("app");
    if (app) app.innerHTML = html;
    window.requestAnimationFrame(() => {
      const nsb = document.getElementById("sidebar");
      if (nsb && __shellScroll > 0) nsb.scrollTop = __shellScroll;
    });
  }

  function closeSidebar() {
    const s = document.getElementById("sidebar");
    const o = document.getElementById("sidebarOverlay");
    if (s) s.classList.remove("open");
    if (o) o.classList.remove("show");
  }

  /* ---------- Shared render helpers ---------- */
  function bookCoverHtml(b, opts) {
    opts = opts || {};
    const cover = b.cover
      ? `<img src="${esc(b.cover)}" alt="${esc(b.judul)}">`
      : `<div class="no-cover">${esc(b.judul || "")}<div style="font-size:10px;opacity:.7;margin-top:4px;">${esc(categoryName(b.kategori_id))}</div></div>`;
    const fav = opts.withFav ? renderFavBtn(b) : "";
    return `<div class="book-cover" data-id="${b.id}">${cover}${fav}</div>`;
  }

  function renderFavBtn(b) {
    const session = getSession();
    if (!session || session.role !== "siswa") return "";
    const db = getDB();
    const student = db.students.find(s => s.user_id === session.user_id);
    const isFav = student && db.favorites.some(f => f.student_id === student.id && f.book_id === b.id);
    return `<button class="fav-btn ${isFav ? "on" : ""}" data-fav="${b.id}" data-on="${isFav ? 1 : 0}" type="button" title="Simpan ke favorit">${isFav ? "❤" : "🤍"}</button>`;
  }

  function badgeHtml(b) {
    const s = bookStatus(b);
    return `<span class="badge badge-${s.type}">${esc(s.label)}</span>`;
  }

  function loanBadge(l) {
    const s = loanStatusInfo(l);
    return `<span class="badge badge-${s.type}">${esc(s.label)}</span>`;
  }

  function bookCardHtml(b, opts) {
    opts = opts || {};
    const favContent = opts.fav !== false ? renderFavBtn(b) : "";
    return `
      <div class="book-card" data-book-id="${b.id}">
        <div class="book-cover" data-open="${b.id}" style="cursor:pointer;">
          ${b.cover ? `<img src="${esc(b.cover)}" alt="${esc(b.judul)}">` : `<div class="no-cover"><b style="font-size:13px;">${esc(b.kode)}</b><div style="font-size:10.5px;opacity:.75;margin-top:5px;text-transform:uppercase;">${esc(categoryName(b.kategori_id))}</div></div>`}
          ${favContent}
        </div>
        <div class="book-body" style="cursor:pointer;" data-open="${b.id}">
          <div class="book-cat">${esc(categoryName(b.kategori_id))}</div>
          <div class="book-title">${esc(b.judul)}</div>
          <div class="book-author">${esc(b.penulis)} • ${esc(b.tahun)}</div>
          <div class="book-foot">${badgeHtml(b)}</div>
          <div class="book-actions">
            <button class="btn btn-ghost btn-sm" data-detail="${b.id}">Detail</button>
            <button class="btn btn-sm" data-pinjam="${b.id}" ${b.available <= 0 ? "disabled" : ""}>${b.available <= 0 ? "Tidak Tersedia" : "Pinjam"}</button>
          </div>
        </div>
      </div>`;
  }

  function loanRowHtml(l, opts) {
    opts = opts || {};
    const b = bookById(l.book_id);
    if (!b) return "";
    const student = studentById(l.student_id);
    const info = loanStatusInfo(l);
    return `
      <div class="loan-item">
        ${b.cover ? `<img class="mini-cover" src="${esc(b.cover)}" alt="">` : `<div class="mini-cover flex items-center justify-center muted" style="font-weight:700;color:var(--primary);">${esc(b.kode)}</div>`}
        <div class="info">
          <b>${esc(b.judul)}</b>
          <span>${esc(b.penulis)}</span>
          ${opts.showStudent ? `<span style="display:block;">👤 ${esc(student ? student.nama : "-")} • ${esc(student ? student.kelas + " " + student.jurusan : "")}</span>` : ""}
          <span style="display:block;">📅 Pinjam ${fmtDate(l.loan_date)} → Due ${fmtDate(l.due_date)}</span>
        </div>
        <span class="badge badge-${info.type}">${esc(info.label)}</span>
        ${opts.actions ? opts.actions(l).join("") : ""}
      </div>`;
  }

  function emptyState(icon, title, msg, actionHtml) {
    const isArt = typeof icon === "string" && /\.(svg|png|jpe?g|webp)$/i.test(icon);
    const action = actionHtml ? `<div class="empty-action">${actionHtml}</div>` : "";
    if (isArt) {
      return `<div class="empty empty-art">
        <div class="empty-art-img"><img src="${esc(icon)}" alt=""></div>
        <b>${esc(title)}</b><p>${esc(msg)}</p>${action}
      </div>`;
    }
    return `<div class="empty"><div class="empty-icon">${icon}</div><b>${esc(title)}</b><p>${esc(msg)}</p>${action}</div>`;
  }

  function renderPagination(container, page, totalPages, cb) {
    if (totalPages <= 1) { container.innerHTML = ""; return; }
    let html = `<button ${page <= 1 ? "disabled" : ""} data-p="${page - 1}">&laquo;</button>`;
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="${i === page ? "active" : ""}" data-p="${i}">${i}</button>`;
    }
    html += `<button ${page >= totalPages ? "disabled" : ""} data-p="${page + 1}">&raquo;</button>`;
    container.innerHTML = html;
    container.querySelectorAll("button[data-p]").forEach(b => {
      b.onclick = () => cb(parseInt(b.dataset.p));
    });
  }

  /* ---------- Realtime Notification Sync ---------- */
  const NOTIF_POLL_MS = 6000;
  let __notifTimer = null;
  let __lastNotifCount = -1;

  function notifBadgeFor(session) {
    if (!session) return 0;
    const dbx = getDB();
    if (session.role === "siswa") {
      const st = dbx.students.find(x => x.user_id === session.user_id);
      return st ? (dbx.notifications || []).filter(n => n.student_id === st.id && !n.is_read).length : 0;
    }
    if (session.role === "guru") {
      const t = dbx.teacher_profiles.find(x => x.user_id === session.user_id);
      if (!t) return 0;
      const pendingReq = (dbx.book_requests || []).filter(r => r.teacher_id === t.id && r.status === "pending").length;
      const unread = (dbx.notifications || []).filter(n => n.teacher_id === t.id && !n.is_read).length;
      return pendingReq + unread;
    }
    if (session.role === "admin") {
      const pUsers = (dbx.users || []).filter(u => u.role === "guru" && u.status === "pending").length;
      const pReqs = (dbx.book_requests || []).filter(r => r.status === "pending").length;
      const pLoans = (dbx.loans || []).filter(l => l.status === "requested").length;
      const dueUnread = (dbx.notifications || []).filter(n => (n.type === "due" || n.type === "late") && !n.is_read).length;
      return pUsers + pReqs + pLoans + dueUnread;
    }
    return 0;
  }

  function refreshNotifBadges() {
    const s = getSession();
    const n = notifBadgeFor(s);
    const countTxt = n > 99 ? "99+" : String(n);
    const dot = document.getElementById("notifDot");
    const badge = document.getElementById("notifBadge");
    if (dot) dot.hidden = n === 0;
    if (badge) { badge.textContent = countTxt; badge.hidden = n === 0; }

    document.querySelectorAll('.nav-item[data-nav="notifikasi"]').forEach(item => {
      if (n > 0) {
        let b = item.querySelector(".nav-badge");
        if (!b) { b = document.createElement("span"); b.className = "nav-badge"; item.appendChild(b); }
        b.textContent = countTxt;
      } else {
        const b = item.querySelector(".nav-badge");
        if (b) b.remove();
      }
    });

    document.querySelectorAll('.bn-item[data-bn="notifikasi"]').forEach(item => {
      if (n > 0) {
        let b = item.querySelector(".bn-badge");
        if (!b) { b = document.createElement("span"); b.className = "bn-badge"; item.appendChild(b); }
        b.textContent = countTxt;
      } else {
        const b = item.querySelector(".bn-badge");
        if (b) b.remove();
      }
    });

    if (n !== __lastNotifCount) {
      __lastNotifCount = n;
      if (typeof window.__ON_NOTIF_CHANGE__ === "function") {
        try { window.__ON_NOTIF_CHANGE__(n); } catch (err) { /* noop */ }
      }
    }
    return n;
  }

  function startNotifSync() {
    refreshNotifBadges();
    clearInterval(__notifTimer);
    __notifTimer = setInterval(refreshNotifBadges, NOTIF_POLL_MS);
    window.removeEventListener("storage", __notifStorageHandler);
    window.addEventListener("storage", __notifStorageHandler);
  }

  function __notifStorageHandler(e) {
    if (!e.key || e.key.indexOf("sipus") === 0) refreshNotifBadges();
  }

  /* ---------- Export app helpers ---------- */
  window.APP = {
    getSession, setSession, clearSession, currentUser, login, requireAuth, registerStudent,
    toast, openModal, confirmDialog, logoutDialog,
    buildSidebar, buildTopbar, afterLayout, go, closeSidebar,
    bookCoverHtml, bookCardHtml, loanRowHtml, emptyState, renderPagination, badgeHtml, loanBadge,
    notifBadgeFor, refreshNotifBadges, startNotifSync, setAppShell,
    esc, fmtDate, fmtDateLong, timeAgo, getDB, saveDB
  };
})();

document.addEventListener("error", (e) => {
  const img = e.target;
  if (!img || img.tagName !== "IMG" || !img.src || img.dataset.fallbackApplied) return;
  const isBookCover = img.closest(".book-cover, .book-card, .loan-item, .mini-cover, .cover-preview, .detail-cover, .bk-thumb, .usulan-cover");
  if (!isBookCover) return;
  img.dataset.fallbackApplied = "1";
  img.src = "assets/books/book-fallback.svg";
}, true);