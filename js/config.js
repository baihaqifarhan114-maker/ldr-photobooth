// ============================================================
// KONFIGURASI — satu-satunya file yang perlu kamu edit!
// Ikuti panduan lengkap di README.md
// ============================================================

// 1) FIREBASE (WAJIB — untuk room code / signaling)
//    Buat project gratis di https://console.firebase.google.com
//    → Build > Realtime Database > Create (test mode)
//    → Project settings > General > Your apps > Web app > copy config
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAHq02Cqfd4Qok6hRwsjOwjDFoj4viCALQ",
  authDomain: "photobooth-98ae8.firebaseapp.com",
  databaseURL: "https://photobooth-98ae8-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "photobooth-98ae8",
};

// 2) ICE SERVERS (koneksi antar laptop)
//    TURN relay via Metered (app: ilovefrida, gratis 20GB/bulan).
//    Kredensial segar di-fetch dari API tiap halaman dibuka; kalau fetch gagal,
//    fallback ke kredensial statis di bawah.
const METERED_CREDS_URL =
  "https://ilovefrida.metered.live/api/v1/turn/credentials?apiKey=2a1683f8f8a68face47db3d6f56a8d03e984";

let ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.relay.metered.ca:80" },
  {
    urls: [
      "turn:global.relay.metered.ca:80",
      "turn:global.relay.metered.ca:80?transport=tcp",
      "turn:global.relay.metered.ca:443",
      "turns:global.relay.metered.ca:443?transport=tcp",
    ],
    username: "3d0d373d8332de6fd94e6a2a",
    credential: "Q37RE7mLkYUcSD+f",
  },
];

// Ambil kredensial TURN terbaru (non-blocking; selesai jauh sebelum user klik apa pun)
(async () => {
  try {
    const r = await fetch(METERED_CREDS_URL);
    if (!r.ok) return;
    const fresh = await r.json();
    if (Array.isArray(fresh) && fresh.length) {
      ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }, ...fresh];
    }
  } catch (_) { /* pakai fallback statis */ }
})();

// Jumlah detik countdown sebelum tiap jepretan
const COUNTDOWN_SECONDS = 3;
// Jeda antar jepretan (ms)
const SHOT_INTERVAL_MS = 1500;
