// Orkestrasi utama: layar, koneksi, sinkronisasi state, countdown, jepret, hasil.

(() => {
  const $ = (id) => document.getElementById(id);
  const screens = {
    landing: $("screen-landing"),
    wait: $("screen-wait"),
    booth: $("screen-booth"),
    result: $("screen-result"),
  };

  let role = null;          // 'host' | 'guest' | 'solo'
  const isSolo = () => role === "solo";
  let myName = "";
  let partnerName = "";
  let photos = [];
  let busy = false;         // sedang sesi foto
  let resultCanvas = null;

  // State yang tersinkron antar dua laptop
  const state = {
    layout: "strip4",
    theme: "pink",
    filter: "normal",
    captionMode: "initials", // initials | names | custom
    customCaption: "",
    captionFont: "dancing",
    showDate: true,
  };

  // ---------- util layar & banner ----------
  function show(name) {
    Object.values(screens).forEach((s) => s.classList.add("hidden"));
    screens[name].classList.remove("hidden");
  }

  let bannerTimer = null;
  function banner(msg, opts = {}) {
    const el = $("banner");
    el.textContent = msg;
    el.classList.toggle("info", !!opts.info);
    el.classList.remove("hidden");
    clearTimeout(bannerTimer);
    if (!opts.sticky) bannerTimer = setTimeout(() => el.classList.add("hidden"), 5000);
  }

  // ---------- suara (WebAudio, tanpa file) ----------
  let audioCtx = null;
  function beep(freq, dur, type = "sine", gain = 0.15) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  }
  const beepTick = () => beep(660, 0.12);
  const beepGo = () => beep(990, 0.25);
  const shutterSound = () => { beep(1600, 0.05, "square", 0.1); setTimeout(() => beep(500, 0.08, "square", 0.1), 60); };

  // ---------- nama & caption ----------
  function leftName()  { return role === "host" ? myName : partnerName; }
  function rightName() { return role === "host" ? partnerName : myName; }

  function captionText() {
    const l = leftName() || "?", r = rightName() || "?";
    if (state.captionMode === "initials")
      return isSolo() ? `${l[0].toUpperCase()} ♥` : `${l[0].toUpperCase()} ♥ ${r[0].toUpperCase()}`;
    if (state.captionMode === "names") return isSolo() ? l : `${l} ♥ ${r}`;
    return state.customCaption;
  }

  function refreshCaptionChips() {
    const l = leftName() || "?", r = rightName() || "?";
    document.querySelector('#ctl-caption [data-value="initials"]').textContent =
      isSolo() ? `${l[0].toUpperCase()} ♥` : `${l[0].toUpperCase()} ♥ ${r[0].toUpperCase()}`;
    document.querySelector('#ctl-caption [data-value="names"]').textContent =
      isSolo() ? l : `${l} ♥ ${r}`;
  }

  // ---------- kontrol chip ----------
  function setupChips(groupId, key) {
    $(groupId).addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip || busy) return;
      state[key] = chip.dataset.value;
      applyState();
      Rtc.send({ t: "state", state });
    });
  }

  function applyState() {
    for (const [groupId, key] of [
      ["ctl-layout", "layout"], ["ctl-theme", "theme"],
      ["ctl-filter", "filter"], ["ctl-caption", "captionMode"],
      ["ctl-font", "captionFont"],
    ]) {
      document.querySelectorAll(`#${groupId} .chip`).forEach((c) =>
        c.classList.toggle("active", c.dataset.value === state[key]));
    }
    $("input-caption").classList.toggle("hidden", state.captionMode !== "custom");
    if (document.activeElement !== $("input-caption"))
      $("input-caption").value = state.customCaption;
    $("ctl-date").checked = state.showDate;
    const frame = $("stage-frame");
    frame.classList.remove("f-bw", "f-vintage", "f-blur");
    if (state.filter === "bw") frame.classList.add("f-bw");
    if (state.filter === "vintage") frame.classList.add("f-vintage");
    if (state.filter === "blur") frame.classList.add("f-blur");
  }

  // ---------- koneksi ----------
  async function startCamera() {
    try {
      return await Rtc.getCamera();
    } catch (err) {
      banner("Kamera ditolak / tidak ada. Izinkan akses kamera lalu coba lagi.", { sticky: true });
      throw err;
    }
  }

  function attachVideos(remoteStream) {
    const local = Rtc.localStream;
    const [leftStream, rightStream] = role === "host" ? [local, remoteStream] : [remoteStream, local];
    $("video-left").srcObject = leftStream;
    $("video-right").srcObject = rightStream;
    $("tag-left").textContent = leftName() || "…";
    $("tag-right").textContent = rightName() || "…";
  }

  function wireRtcHandlers() {
    Rtc.on({
      onRemoteStream: (stream) => attachVideos(stream),
      onConnected: () => {
        Signaling.cleanup(role === "host");
        Rtc.send({ t: "hello", name: myName });
        show("booth");
        applyState();
        banner(`Tersambung! 🎉`, { info: true });
      },
      onDisconnected: () => {
        banner(`${partnerName || "Pasangan"} terputus 😢 — kembali ke awal.`, { sticky: true });
        setTimeout(resetToLanding, 2500);
      },
      onData: handleData,
    });
  }

  function handleData(msg) {
    if (msg.t === "hello") {
      partnerName = msg.name;
      $("tag-left").textContent = leftName() || "…";
      $("tag-right").textContent = rightName() || "…";
      refreshCaptionChips();
      if (role === "host") Rtc.send({ t: "state", state }); // host kirim state awal
    }
    if (msg.t === "state") {
      Object.assign(state, msg.state);
      applyState();
    }
    if (msg.t === "begin") runSequence(false);
    if (msg.t === "retake") doRetake(false);
  }

  function requireName() {
    myName = $("input-name").value.trim();
    if (!myName) {
      banner("Isi nama kamu dulu ya 😊");
      $("input-name").focus();
      return false;
    }
    return true;
  }

  async function createRoom() {
    if (!requireName()) return;
    if (!Signaling.ensureInit()) {
      banner("Firebase belum di-setting! Buka README.md untuk panduan 5 menit.", { sticky: true });
      return;
    }
    try {
      await startCamera();
      role = "host";
      const code = await Signaling.createRoom();
      $("code-display").textContent = code;
      show("wait");
      wireRtcHandlers();
      await Rtc.startAsHost();
    } catch (err) {
      if (err.message !== "no-config") console.error(err);
      banner("Gagal membuat room. Cek koneksi & config Firebase.", { sticky: true });
    }
  }

  async function joinRoom() {
    if (!requireName()) return;
    const code = $("input-code").value.trim().toUpperCase();
    if (code.length !== 6) { banner("Kode room 6 huruf ya"); return; }
    if (!Signaling.ensureInit()) {
      banner("Firebase belum di-setting! Buka README.md untuk panduan 5 menit.", { sticky: true });
      return;
    }
    try {
      await startCamera();
      role = "guest";
      await Signaling.joinRoom(code);
      $("wait-title").textContent = "Menyambungkan…";
      $("code-display").textContent = code;
      $("wait-status").innerHTML = 'Menghubungkan ke pasanganmu<span class="dots"></span>';
      show("wait");
      wireRtcHandlers();
      await Rtc.startAsGuest();
    } catch (err) {
      if (err.message === "not-found") banner("Room tidak ditemukan. Cek lagi kodenya.");
      else if (err.message === "room-full") banner("Room sudah penuh.");
      else banner("Gagal gabung room. Coba lagi.");
    }
  }

  // Mode solo: langsung ke booth tanpa room/koneksi
  async function startSolo() {
    if (!requireName()) return;
    try {
      await startCamera();
    } catch (_) { return; }
    role = "solo";
    $("stage-frame").classList.add("solo");
    $("video-left").srcObject = Rtc.localStream;
    $("tag-left").textContent = myName;
    refreshCaptionChips();
    show("booth");
    applyState();
  }

  function resetToLanding() {
    Rtc.close();
    Signaling.cleanup(role === "host");
    $("stage-frame").classList.remove("solo");
    photos = [];
    busy = false;
    role = null;
    partnerName = "";
    show("landing");
  }

  // ---------- sesi foto ----------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function runSequence(isInitiator) {
    if (busy) return;
    busy = true;
    if (isInitiator) Rtc.send({ t: "begin" });
    $("btn-start").disabled = true;

    const total = Strip.LAYOUTS[state.layout].shots;
    photos = [];
    $("shot-total").textContent = total;
    $("shot-progress").classList.remove("hidden");

    for (let shot = 1; shot <= total; shot++) {
      $("shot-current").textContent = shot;
      // countdown
      const overlay = $("countdown-overlay"), num = $("countdown-num");
      overlay.classList.remove("hidden");
      for (let n = COUNTDOWN_SECONDS; n >= 1; n--) {
        num.textContent = n;
        num.style.animation = "none"; void num.offsetWidth; num.style.animation = "";
        beepTick();
        await sleep(1000);
      }
      overlay.classList.add("hidden");
      // jepret!
      beepGo(); shutterSound();
      $("flash").classList.remove("on"); void $("flash").offsetWidth;
      $("flash").classList.add("on");
      const L = Strip.LAYOUTS[state.layout];
      photos.push(Strip.capturePhoto($("video-left"), isSolo() ? null : $("video-right"), state.filter, L.photoW, L.photoH));
      if (shot < total) await sleep(SHOT_INTERVAL_MS);
    }

    $("shot-progress").classList.add("hidden");
    await finishStrip();
    busy = false;
    $("btn-start").disabled = false;
  }

  async function finishStrip() {
    const F = Strip.CAPTION_FONTS[state.captionFont] || Strip.CAPTION_FONTS.dancing;
    try { await document.fonts.load(F.css); } catch (_) {}
    resultCanvas = Strip.composeStrip(photos, {
      layout: state.layout,
      theme: state.theme,
      caption: captionText(),
      showDate: state.showDate,
      captionFont: state.captionFont,
    });
    $("result-img").src = resultCanvas.toDataURL("image/png");
    show("result");
    downloadStrip(); // auto-download
  }

  function downloadStrip() {
    if (!resultCanvas) return;
    const a = document.createElement("a");
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    a.download = `photobooth-berdua-${stamp}.png`;
    a.href = resultCanvas.toDataURL("image/png");
    a.click();
  }

  function doRetake(isInitiator) {
    if (isInitiator) Rtc.send({ t: "retake" });
    photos = [];
    resultCanvas = null;
    show("booth");
    applyState();
  }

  // ---------- event wiring ----------
  $("btn-create").addEventListener("click", createRoom);
  $("btn-join").addEventListener("click", joinRoom);
  $("btn-solo").addEventListener("click", startSolo);
  $("input-code").addEventListener("keydown", (e) => e.key === "Enter" && joinRoom());
  $("btn-cancel").addEventListener("click", resetToLanding);
  $("btn-copy").addEventListener("click", async () => {
    await navigator.clipboard.writeText($("code-display").textContent);
    banner("Kode tersalin! Kirim ke pasanganmu 💌", { info: true });
  });
  $("btn-start").addEventListener("click", () => runSequence(true));
  $("btn-download").addEventListener("click", downloadStrip);
  $("btn-retake").addEventListener("click", () => doRetake(true));

  setupChips("ctl-layout", "layout");
  setupChips("ctl-theme", "theme");
  setupChips("ctl-filter", "filter");
  setupChips("ctl-caption", "captionMode");
  setupChips("ctl-font", "captionFont");

  $("input-caption").addEventListener("input", () => {
    state.customCaption = $("input-caption").value;
    Rtc.send({ t: "state", state });
  });
  $("ctl-date").addEventListener("change", () => {
    state.showDate = $("ctl-date").checked;
    Rtc.send({ t: "state", state });
  });

  // preload semua font caption buat canvas
  try {
    for (const f of Object.values(Strip.CAPTION_FONTS)) document.fonts.load(f.css);
  } catch (_) {}
})();
