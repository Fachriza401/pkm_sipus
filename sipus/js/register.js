/* ============================================================
   SIPUS — Halaman Registrasi (v3)
   Form terpisah: Siswa (langsung Aktif) & Guru (Verifikasi).
   Tanpa gambar manusia.
   ============================================================ */
(function () {
  const S = window.SIPUS, A = window.APP;
  const $ = id => document.getElementById(id);

  const KELAS = ["X IPA 1", "X IPA 2", "X IPS 1", "X IPS 2", "XI IPA 1", "XI IPA 2", "XI IPS 1", "XI IPS 2", "XII IPA 1", "XII IPA 2", "XII IPS 1", "XII IPS 2"];
  const MAPEL = ["Bahasa Indonesia", "Bahasa Inggris", "Matematika", "Fisika", "Kimia", "Biologi", "Sejarah", "Geografi", "Ekonomi", "Sosiologi", "Informatika", "Pendidikan Agama", "PJOK", "Seni Budaya", "Lainnya"];
  const ICONS = {
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 5 5 9-11"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
  };
  const EYE_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.1 10.1 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>';

  let mode = "siswa";
  let userTimer = null;

  /* ---------- populate dropdown ---------- */
  KELAS.forEach(k => $("kelasS").insertAdjacentHTML("beforeend", `<option value="${A.esc(k)}">${A.esc(k)}</option>`));
  MAPEL.forEach(m => $("mapelG").insertAdjacentHTML("beforeend", `<option value="${A.esc(m)}">${A.esc(m)}</option>`));

  function fieldSuffix() { return mode === "siswa" ? "S" : "G"; }

  function clearFieldFeedback() {
    document.querySelectorAll(".a-feedback").forEach(f => {
      f.textContent = "";
      f.className = "a-feedback";
    });
    document.querySelectorAll(".a-field").forEach(f => f.classList.remove("is-invalid", "is-valid"));
  }

  function zeroMeter(sfx) {
    const m = $("pwMeter" + sfx);
    if (!m) return;
    m.classList.remove("show", "weak", "fair", "strong");
    m.querySelectorAll("i").forEach(i => i.classList.remove("on"));
    $("pwLabel" + sfx).textContent = "Minimal 6 karakter";
  }

  function setMode(m) {
    mode = m;
    document.querySelectorAll("#modeSwitch button").forEach(b => {
      const on = b.dataset.mode === m;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", String(on));
    });

    $("registerFormSiswa").hidden = m !== "siswa";
    $("registerFormGuru").hidden = m !== "guru";

    (m === "siswa" ? $("registerFormSiswa") : $("registerFormGuru")).reset();
    clearFieldFeedback();
    zeroMeter("S");
    zeroMeter("G");
    $("alertBox").innerHTML = "";
    $("phaseForm").classList.add("active");
    $("phaseDone").classList.remove("active");
  }

  function setErr(fieldId, fbId, msg) {
    $(fbId).textContent = msg;
    $(fbId).className = "a-feedback is-error";
    $(fieldId).classList.add("is-invalid");
  }

  function showAlert(msg) {
    $("alertBox").innerHTML = msg
      ? `<div class="a-alert a-alert--error">${ICONS.alert}<span>${A.esc(msg)}</span></div>`
      : "";
  }

  function strength(pw) {
    let s = 0;
    if (pw.length >= 6) s++;
    if (pw.length >= 10) s++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
    if (/\d/.test(pw) || /\W/.test(pw)) s++;
    return s;
  }

  /* ---------- live username availability ---------- */
  function wireUsername(sfx) {
    $("user" + sfx).oninput = function () {
      clearTimeout(userTimer);
      userTimer = setTimeout(() => {
        const v = this.value.trim();
        const fb = $("fbUser" + sfx);
        const field = $("fUser" + sfx);
        if (!v) { fb.textContent = ""; fb.className = "a-feedback"; field.classList.remove("is-invalid", "is-valid"); return; }
        if (v.length < 4) { fb.textContent = "Username minimal 4 karakter."; fb.className = "a-feedback is-error"; field.classList.add("is-invalid"); field.classList.remove("is-valid"); return; }
        if (!/^[a-zA-Z0-9._-]+$/.test(v)) { fb.textContent = "Hanya huruf, angka, titik, strip."; fb.className = "a-feedback is-error"; field.classList.add("is-invalid"); field.classList.remove("is-valid"); return; }
        const db = S.getDB();
        const exists = db.users.some(u => u.username.toLowerCase() === v.toLowerCase());
        if (exists) {
          fb.textContent = "Username sudah digunakan.";
          fb.className = "a-feedback is-error";
          field.classList.add("is-invalid");
          field.classList.remove("is-valid");
        } else {
          fb.textContent = "Username tersedia.";
          fb.className = "a-feedback is-ok";
          field.classList.remove("is-invalid");
          field.classList.add("is-valid");
        }
      }, 280);
    };
  }

  /* ---------- password strength / confirm / toggles ---------- */
  function togglePass(input, btn) {
    const isPwd = input.type === "password";
    input.type = isPwd ? "text" : "password";
    btn.innerHTML = isPwd ? EYE_OFF : EYE_ON;
  }

  function wirePw(sfx) {
    $("pw" + sfx).oninput = function () {
      const v = this.value;
      const meter = $("pwMeter" + sfx);
      const label = $("pwLabel" + sfx);
      $("fbPw" + sfx).textContent = ""; $("fbPw" + sfx).className = "a-feedback";
      $("fPw" + sfx).classList.remove("is-invalid", "is-valid");
      if (!v) { zeroMeter(sfx); return; }
      const sc = strength(v);
      meter.classList.add("show");
      meter.classList.toggle("weak", sc <= 1);
      meter.classList.toggle("fair", sc === 2);
      meter.classList.toggle("strong", sc >= 3);
      const on = sc >= 3 ? 3 : sc === 2 ? 2 : 1;
      meter.querySelectorAll("i").forEach((i, idx) => i.classList.toggle("on", idx < on));
      label.textContent = sc >= 3 ? "Kuat" : sc === 2 ? "Cukup" : "Lemah";
    };

    $("cf" + sfx).oninput = function () {
      const v = this.value;
      const fb = $("fbCf" + sfx);
      const field = $("fCf" + sfx);
      if (!v) { fb.textContent = ""; fb.className = "a-feedback"; field.classList.remove("is-invalid", "is-valid"); return; }
      if (v === $("pw" + sfx).value) {
        fb.textContent = "Kata sandi sesuai.";
        fb.className = "a-feedback is-ok";
        field.classList.remove("is-invalid");
        field.classList.add("is-valid");
      } else {
        fb.textContent = "Kata sandi belum sama.";
        fb.className = "a-feedback is-error";
        field.classList.add("is-invalid");
        field.classList.remove("is-valid");
      }
    };

    $("togglePw" + sfx).onclick = () => togglePass($("pw" + sfx), $("togglePw" + sfx));
    $("toggleCf" + sfx).onclick = () => togglePass($("cf" + sfx), $("toggleCf" + sfx));
  }

  /* ---------- submit (per role) ---------- */
  function bindForm(role) {
    const isSiswa = role === "siswa";
    const fx = isSiswa ? "S" : "G";
    $("registerForm" + (isSiswa ? "Siswa" : "Guru")).onsubmit = function (e) {
      e.preventDefault();
      clearFieldFeedback();
      showAlert("");
      let ok = true;

      const nama = $("name" + fx).value.trim();
      const username = $("user" + fx).value.trim();
      const hp = $("hp" + fx).value.trim();
      const email = $("email" + fx).value.trim();
      const pw = $("pw" + fx).value;
      const cf = $("cf" + fx).value;
      const agree = $("agree" + fx).checked;

      if (nama.length < 3) { setErr("fNama" + fx, "fbName" + fx, "Nama lengkap wajib diisi (minimal 3 karakter)."); ok = false; }
      if (username.length < 4) { setErr("fUser" + fx, "fbUser" + fx, "Username minimal 4 karakter."); ok = false; }
      else if (!/^[a-zA-Z0-9._-]+$/.test(username)) { setErr("fUser" + fx, "fbUser" + fx, "Hanya huruf, angka, titik, strip."); ok = false; }
      if (pw.length < 6) { setErr("fPw" + fx, "fbPw" + fx, "Password minimal 6 karakter."); ok = false; }
      if (cf !== pw || !cf) { setErr("fCf" + fx, "fbCf" + fx, "Konfirmasi kata sandi belum sama."); ok = false; }
      if (!agree) { $("fbAgree" + fx).textContent = "Centang pernyataan data pendaftaran terlebih dahulu."; $("fbAgree" + fx).className = "a-feedback is-error"; ok = false; }
      if (hp && !/^08\d{8,12}$/.test(hp.replace(/[\s-]/g, ""))) { setErr("fHp" + fx, "fbHp" + fx, "Format No. HP tidak valid (contoh: 081234567890)."); ok = false; }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr("fEmail" + fx, "fbEmail" + fx, "Format email tidak valid."); ok = false; }

      const db = S.getDB();

      if (isSiswa) {
        const nis = $("nisS").value.trim();
        const kelas = $("kelasS").value;
        if (!/^\d{4,15}$/.test(nis)) { setErr("fNisS", "fbNisS", "NIS harus berupa angka 4–15 digit."); ok = false; }
        if (!kelas) { setErr("fKelasS", "fbKelasS", "Pilih kelas terlebih dahulu."); ok = false; }
        if (ok && db.students.some(s => String(s.nis).trim() === nis)) { setErr("fNisS", "fbNisS", "NIS tersebut sudah terdaftar."); ok = false; }
        if (ok && db.users.some(u => u.role === "siswa" && u.username === nis)) { setErr("fNisS", "fbNisS", "NIS tersebut sudah terdaftar."); ok = false; }
      } else {
        const nip = $("nipG").value.trim();
        const mapel = $("mapelG").value;
        if (!/^\d{6,20}$/.test(nip)) { setErr("fNipG", "fbNipG", "NIP harus berupa angka 6–20 digit."); ok = false; }
        if (!mapel) { setErr("fMapelG", "fbMapelG", "Pilih mata pelajaran terlebih dahulu."); ok = false; }
        if (ok && db.teacher_profiles.some(t => t.nip === nip)) { setErr("fNipG", "fbNipG", "NIP tersebut sudah terdaftar."); ok = false; }
      }

      if (!ok) return;

      const exists = db.users.some(u => u.username.toLowerCase() === username.toLowerCase());
      if (exists) { setErr("fUser" + fx, "fbUser" + fx, "Username sudah digunakan."); return; }

      const btn = isSiswa ? $("btnRegisterSiswa") : $("btnRegisterGuru");
      btn.classList.add("is-loading");

      setTimeout(() => {
        const uid = S.uid("usr-");
        const user = {
          id: uid, username, password: pw,
          role, status: isSiswa ? "Aktif" : "pending",
          name: nama, created_at: new Date().toISOString()
        };
        db.users.push(user);

        if (isSiswa) {
          const [level, ...rest] = kelas.split(" ");
          const sid = S.uid("std-");
          db.students.push({
            id: sid, user_id: uid, nis, nama,
            kelas: level, jurusan: rest.join(" "),
            gender: "", kontak: hp, email, foto: ""
          });
          db.notifications.unshift({
            id: S.uid("ntf-"), student_id: sid, type: "system",
            title: "Selamat bergabung di SIPUS",
            message: "Akun kamu aktif. Jelajahi katalog dan mulai membaca!",
            is_read: false, created_at: new Date().toISOString()
          });
        } else {
          db.teacher_profiles.push({
            id: S.uid("tch-"), user_id: uid, nip, nama,
            mapel, kelas: "", email, no_hp: hp, foto: ""
          });
        }

        db.audit_logs.unshift({
          id: S.uid("au-"), user_id: uid,
          action: "Registrasi", module: isSiswa ? "Siswa" : "Guru",
          detail: `${isSiswa ? "Siswa baru mendaftar mandiri" : "Guru baru mendaftar (menunggu verifikasi)"}: ${nama} (${username})`,
          created_at: new Date().toISOString()
        });

        S.saveDB(db);

        btn.classList.remove("is-loading");
        showSuccess(isSiswa, username);
      }, 550);
    };
  }

  function showSuccess(isSiswa, username) {
    const badge = isSiswa
      ? `<div class="a-check-badge ok ring" style="position:relative;">${ICONS.ok}</div>`
      : `<div class="a-check-badge pending ring" style="position:relative;">${ICONS.clock}</div>`;
    const status = isSiswa
      ? `<span class="a-status-badge a-status-badge--ok">${ICONS.ok} Akun Aktif</span>`
      : `<span class="a-status-badge a-status-badge--pending">${ICONS.clock} Menunggu Verifikasi</span>`;
    const body = isSiswa
      ? `<p>Akun siswa <b>${A.esc(username)}</b> sudah aktif. Kamu bisa langsung menjelajahi katalog dan meminjam buku.</p>`
      : `<p>Akun guru <b>${A.esc(username)}</b> sedang ditinjau admin. Kamu dapat masuk setelah akun disetujui oleh admin perpustakaan.</p>`;
    const btn = isSiswa
      ? `<a href="login.html" class="a-btn" style="text-decoration:none;">Masuk ke Perpustakaan ${ICONS.arrow}</a>`
      : `<a href="login.html" class="a-btn" style="text-decoration:none;">Kembali ke Login ${ICONS.arrow}</a>`;
    const footNote = isSiswa
      ? `<p class="auth-cta"><a href="login.html">Nanti saja</a></p>`
      : `<p class="auth-cta">Kamu akan bisa masuk begitu akun disetujui.</p>`;

    $("successBox").innerHTML = `<div class="a-success">${badge}<h3>Registrasi Berhasil</h3>${status}${body}${btn}${footNote}</div>`;
    $("phaseForm").classList.remove("active");
    $("phaseDone").classList.add("active");
  }

  document.querySelectorAll("#modeSwitch button").forEach(b => {
    b.onclick = () => setMode(b.dataset.mode);
  });

  wireUsername("S");
  wireUsername("G");
  wirePw("S");
  wirePw("G");
  bindForm("siswa");
  bindForm("guru");

  setMode("siswa");
})();