# 📸 Photobooth Berdua

Photobooth online untuk pasangan LDR — foto bareng dari laptop masing-masing.
Tiap jepretan menghasilkan **satu foto berisi dua wajah berdampingan**, disusun jadi strip
yang bisa di-download PNG oleh berdua.

**Fitur:** room code · countdown sinkron + suara + flash · 3 layout (strip 4 / strip 3 / grid 2×2)
· 4 tema frame · 3 filter · caption custom (`F ♥ F`, `Farhan ♥ Frida`, atau bebas) · auto-download.

**Privasi:** video mengalir langsung antar laptop (WebRTC peer-to-peer). Tidak ada server
yang melihat atau menyimpan foto/video kalian.

---

## Setup (sekali doang, ±5 menit)

Website ini butuh **Firebase** (gratis) cuma buat "kenalan awal" antara dua laptop
(tukar kode koneksi). Setelah tersambung, Firebase tidak dipakai lagi.

### 1. Buat project Firebase

1. Buka [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
   → kasih nama bebas (misal `photobooth-berdua`) → Analytics boleh dimatiin → **Create**.
2. Di sidebar: **Build → Realtime Database → Create Database**
   → pilih lokasi Singapore (`asia-southeast1`) → mulai di **test mode** → **Enable**.
3. Ganti rules biar aman dikit: tab **Rules**, tempel ini lalu **Publish**:
   ```json
   {
     "rules": {
       "rooms": {
         "$code": { ".read": true, ".write": true }
       },
       ".read": false,
       ".write": false
     }
   }
   ```
4. Klik ikon ⚙️ **Project settings → General**, scroll ke **Your apps**
   → klik ikon web `</>` → kasih nickname bebas → **Register app**.
5. Bakal muncul `firebaseConfig = { ... }` — **copy 4 nilai ini**:
   `apiKey`, `authDomain`, `databaseURL`, `projectId`.

### 2. Tempel config

Edit [`js/config.js`](js/config.js), isi `FIREBASE_CONFIG` dengan nilai dari langkah di atas:

```js
const FIREBASE_CONFIG = {
  apiKey: "AIza....",
  authDomain: "photobooth-berdua.firebaseapp.com",
  databaseURL: "https://photobooth-berdua-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "photobooth-berdua",
};
```

> ⚠️ Kalau `databaseURL` tidak muncul di config, ambil dari halaman Realtime Database
> (URL yang tampil di atas data, bentuknya `https://....firebasedatabase.app`).

Lalu commit & push:

```bash
git add js/config.js
git commit -m "Add Firebase config"
git push
```

Tunggu ±1 menit, GitHub Pages otomatis update. Selesai! 🎉

### 3. (Opsional) TURN sendiri — kalau koneksi sering gagal

Default sudah pakai STUN Google + TURN gratis Open Relay. Kalau kalian susah nyambung
(jaringan kampus/kantor yang ketat), daftar gratis di
[metered.ca](https://dashboard.metered.ca/signup) → buat app → copy ICE servers
→ ganti isi `ICE_SERVERS` di `js/config.js`.

---

## Cara pakai

1. Buka website-nya (dua-duanya, dari laptop masing-masing, pakai **Chrome/Edge/Firefox**).
2. Kamu: isi nama → **Buat Room** → dapat kode 6 huruf → kirim ke pasangan via WA.
3. Dia: isi nama → masukkan kode → **Gabung**.
4. Tersambung! Pilih layout, tema, filter, caption (pilihan kalian otomatis sinkron).
5. Klik **Mulai Foto** → countdown 3-2-1 bareng → jepret → strip jadi → auto-download. 💕

## Jalanin lokal (buat develop)

```bash
npx serve .
```

Kamera butuh HTTPS atau `localhost` — jangan buka via `file://`.

## Teknologi

HTML/CSS/JS murni tanpa build step · WebRTC (video P2P + data channel untuk sinkronisasi
countdown & pilihan) · Firebase Realtime Database (signaling saja) · Canvas API (compositing
foto & strip) · WebAudio (bunyi countdown & shutter).
