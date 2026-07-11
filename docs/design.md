# LDR Photobooth — Design Spec (2026-07-11)

## Tujuan
Photobooth online untuk dua orang LDR. Keduanya membuka website dari laptop masing-masing,
tersambung lewat room code, dan tiap jepretan menghasilkan SATU foto berisi dua wajah
berdampingan (kiri = pembuat room, kanan = yang join). Hasil akhir: strip foto yang bisa
di-download PNG oleh keduanya.

## Arsitektur
- **Situs statis** (HTML/CSS/JS murni) — di-host di GitHub Pages (HTTPS, wajib untuk kamera).
- **WebRTC peer-to-peer** — video mengalir langsung antar laptop; tidak ada server yang
  melihat/menyimpan video.
- **Firebase Realtime Database** — hanya untuk signaling (tukar offer/answer/ICE saat awal
  connect). Setelah tersambung tidak dipakai.
- **STUN Google + TURN Open Relay (gratis)** — agar koneksi tembus NAT/jaringan beda kota.
  Slot config Metered TURN opsional di `js/config.js`.
- **Data channel** WebRTC — sinkronisasi state (layout, tema, filter, caption) dan trigger
  countdown agar kedua laptop menjepret di momen yang sama.
- **Compositing lokal** — saat jepret, tiap laptop menggambar video-sendiri + video-pasangan
  ke canvas. Kedua preview di-mirror (gaya selfie) agar hasil download keduanya identik.

## Alur
1. Landing: isi nama → "Buat Room" (dapat kode 6 huruf) atau "Gabung" (masukkan kode).
2. Tersambung → booth: dua video live berdampingan, panel pilihan.
3. Pilihan (tersinkron dua arah): layout (strip 4 / strip 3 / grid 2×2), tema frame,
   filter (normal / B&W / vintage), caption (inisial `F ♥ F` / nama `Farhan ♥ Frida` /
   custom), toggle tanggal.
4. "Mulai" → countdown 3-2-1 dengan bunyi + flash → jepret → ulang sesuai jumlah foto.
5. Hasil strip tampil → auto-download PNG + tombol download ulang / foto ulang.

## File
- `index.html` — landing + booth + hasil (satu halaman, section di-toggle)
- `css/style.css` — tema romantis pastel
- `js/config.js` — Firebase config + ICE servers (satu-satunya file yang diedit user)
- `js/signaling.js` — buat/join room via Firebase RTDB
- `js/webrtc.js` — RTCPeerConnection, media, data channel
- `js/booth.js` — UI state, sinkronisasi, countdown, suara (WebAudio), capture
- `js/strip.js` — komposisi strip (layout × tema) + export PNG

## Error handling
- Kamera ditolak → pesan jelas + tombol coba lagi.
- Kode room salah/kadaluarsa → pesan.
- Pasangan disconnect → banner + opsi tunggu/kembali.
- Firebase config kosong → banner instruksi setup (link README).

## Non-goals
- Tidak ada audio call (mic off; photobooth, bukan video call).
- Tidak ada penyimpanan foto di server.
- Maksimal 2 orang per room.
