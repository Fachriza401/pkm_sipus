/* ============================================================
   SIPUS — Halaman Login (v2)
   Form unified untuk Siswa / Guru / Admin. Tanpa gambar manusia.
   ============================================================ */
(function () {
  const { getDB } = window.SIPUS;

  const APP_BY_ROLE = { siswa: "app-student.html", guru: "app-guru.html", admin: "app-admin.html" };
  let isSubmitting = false;

  function setLoginTransition(visible, title, text) {
    const transition = document.getElementById("loginTransition");
    if (!transition) return;
    if (title) document.getElementById("loginTransitionTitle").textContent = title;
    if (text) document.getElementById("loginTransitionText").textContent = text;
    transition.classList.toggle("is-visible", visible);
    transition.setAttribute("aria-hidden", String(!visible));
    document.body.classList.toggle("is-authenticating", visible);
  }

  function initBranding() {
    const db = getDB();
    const s = db.settings || {};
    const schoolName = s.school_name || "SMA Swasta Pencawan";
    const logo = document.getElementById("brandLogo");
    if (logo && logo.tagName === "IMG") logo.alt = "Logo " + schoolName;
    const bs = document.getElementById("brandSchool");
    if (bs) bs.textContent = schoolName;
    const bsMobile = document.getElementById("brandSchoolMobile");
    if (bsMobile) bsMobile.textContent = schoolName;
    const feet = [document.getElementById("brandFoot"), document.getElementById("formFoot")];
    feet.forEach(f => f && (f.textContent = schoolName + " • SIPUS v2.0.0"));
    document.title = `SIPUS — Masuk | ${schoolName}`;
  }

  function showError(msg) {
    const box = document.getElementById("alertBox");
    box.innerHTML = `<div class="a-alert a-alert--error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>
      <span>${window.APP.esc(msg)}</span>
    </div>`;
    if (box.scrollIntoView) box.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function init() {
    initBranding();

    const toggle = document.getElementById("togglePass");
    toggle.onclick = () => {
      const p = document.getElementById("password");
      const isPwd = p.type === "password";
      p.type = isPwd ? "text" : "password";
      toggle.innerHTML = isPwd
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.1 10.1 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      toggle.title = isPwd ? "Sembunyikan password" : "Tampilkan password";
    };

    document.getElementById("loginForm").onsubmit = (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      const form = document.getElementById("loginForm");
      const alertBox = document.getElementById("alertBox");
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value;
      const remember = document.getElementById("remember").checked;
      alertBox.innerHTML = "";

      if (!username || !password) {
        showError("Username/NIS dan password wajib diisi.");
        return;
      }

      const db = getDB();
      const user = db.users.find(u => u.username === username && u.password === password);

      if (user && user.role === "guru" && user.status === "pending") {
        showError("Akun guru kamu masih menunggu verifikasi admin. Kamu dapat masuk setelah akun disetujui.");
        return;
      }

      isSubmitting = true;
      const btn = document.getElementById("btnLogin");
      btn.disabled = true;
      btn.classList.add("is-loading");
      form.setAttribute("aria-busy", "true");
      setLoginTransition(true, "Memverifikasi akun", "Mohon tunggu sebentar.");

      setTimeout(() => {
        const res = window.APP.login(username, password);
        if (!res || res.error) {
          isSubmitting = false;
          btn.disabled = false;
          btn.classList.remove("is-loading");
          form.setAttribute("aria-busy", "false");
          setLoginTransition(false);
          showError(res && res.error ? res.error : "Terjadi kendala saat masuk. Silakan coba lagi.");
          return;
        }

        window.APP.setSession(res.user, remember);
        const firstName = res.user.name.split(" ")[0];
        setLoginTransition(true, "Berhasil masuk", `Selamat datang, ${firstName}. Menyiapkan portal SIPUS.`);
        setTimeout(() => {
          location.href = APP_BY_ROLE[res.user.role] || "app-student.html";
        }, 900);
      }, 500);
    };
  }

  document.addEventListener("DOMContentLoaded", init);
})();