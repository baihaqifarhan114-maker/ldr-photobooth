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
//    Default: STUN Google (gratis, cukup untuk banyak jaringan rumah).
//    KALAU sering stuck di "Menghubungkan..." (jaringan CGNAT/kampus/kantor),
//    kalian butuh TURN relay: daftar GRATIS di https://dashboard.metered.ca/signup
//    (20GB/bulan) -> buat app -> copy blok "ICE Servers" -> tempel menggantikan
//    array di bawah. Kredensial publik openrelayproject sudah MATI, jangan dipakai.
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// Jumlah detik countdown sebelum tiap jepretan
const COUNTDOWN_SECONDS = 3;
// Jeda antar jepretan (ms)
const SHOT_INTERVAL_MS = 1500;
