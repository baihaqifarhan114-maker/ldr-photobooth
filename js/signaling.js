// Signaling via Firebase Realtime Database.
// Hanya dipakai saat awal connect (tukar offer/answer/ICE candidate).

const Signaling = (() => {
  let db = null;
  let roomRef = null;
  let listeners = [];

  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa I/O/0/1 biar ga ketuker

  function ensureInit() {
    if (db) return true;
    if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.databaseURL) return false;
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
    return true;
  }

  function genCode() {
    let code = "";
    const buf = new Uint8Array(6);
    crypto.getRandomValues(buf);
    for (const b of buf) code += CODE_CHARS[b % CODE_CHARS.length];
    return code;
  }

  function watch(ref, event, cb) {
    ref.on(event, cb);
    listeners.push([ref, event, cb]);
  }

  // Host: buat room baru, return kodenya
  async function createRoom() {
    if (!ensureInit()) throw new Error("no-config");
    const code = genCode();
    roomRef = db.ref("rooms/" + code);
    await roomRef.set({ createdAt: firebase.database.ServerValue.TIMESTAMP });
    roomRef.onDisconnect().remove(); // auto-bersih kalau host cabut sebelum selesai
    return code;
  }

  // Guest: pastikan room ada
  async function joinRoom(code) {
    if (!ensureInit()) throw new Error("no-config");
    code = code.toUpperCase().trim();
    const snap = await db.ref("rooms/" + code).get();
    if (!snap.exists()) throw new Error("not-found");
    if (snap.val().answer) throw new Error("room-full");
    roomRef = db.ref("rooms/" + code);
    return code;
  }

  async function sendOffer(offer) {
    await roomRef.child("offer").set(JSON.parse(JSON.stringify(offer)));
  }
  async function sendAnswer(answer) {
    await roomRef.child("answer").set(JSON.parse(JSON.stringify(answer)));
  }
  function onOffer(cb) {
    watch(roomRef.child("offer"), "value", (s) => s.exists() && cb(s.val()));
  }
  function onAnswer(cb) {
    watch(roomRef.child("answer"), "value", (s) => s.exists() && cb(s.val()));
  }
  async function sendCandidate(role, cand) {
    await roomRef.child("candidates/" + role).push(JSON.parse(JSON.stringify(cand)));
  }
  function onCandidate(role, cb) {
    watch(roomRef.child("candidates/" + role), "child_added", (s) => cb(s.val()));
  }

  // Setelah WebRTC nyambung, signaling tidak dipakai lagi
  function cleanup(removeRoom) {
    for (const [ref, event, cb] of listeners) ref.off(event, cb);
    listeners = [];
    if (roomRef) {
      roomRef.onDisconnect().cancel();
      if (removeRoom) roomRef.remove();
      roomRef = null;
    }
  }

  return { createRoom, joinRoom, sendOffer, sendAnswer, onOffer, onAnswer, sendCandidate, onCandidate, cleanup, ensureInit };
})();
