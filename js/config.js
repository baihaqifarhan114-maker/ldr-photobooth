// ============================================================
// KONFIGURASI — satu-satunya file yang perlu kamu edit!
// Ikuti panduan lengkap di README.md
// ============================================================

// 1) FIREBASE (WAJIB — untuk room code / signaling)
//    Buat project gratis di https://console.firebase.google.com
//    → Build > Realtime Database > Create (test mode)
//    → Project settings > General > Your apps > Web app > copy config
const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
};

// 2) ICE SERVERS (koneksi antar laptop)
//    Default: STUN Google + TURN gratis Open Relay Project.
//    Kalau koneksi sering gagal, daftar gratis di https://www.metered.ca/tools/openrelay/
//    lalu tambahkan kredensialmu di bawah.
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: [
      "turn:standard.relay.metered.ca:80",
      "turn:standard.relay.metered.ca:443",
      "turns:standard.relay.metered.ca:443?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

// Jumlah detik countdown sebelum tiap jepretan
const COUNTDOWN_SECONDS = 3;
// Jeda antar jepretan (ms)
const SHOT_INTERVAL_MS = 1500;
