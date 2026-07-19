// Koneksi WebRTC peer-to-peer: video dua arah + data channel untuk sinkronisasi.

const Rtc = (() => {
  let pc = null;
  let dataChannel = null;
  let localStream = null;
  let pendingSends = [];
  let pendingCandidates = [];   // ICE candidate yang datang sebelum remote description siap
  let isHostRole = false;
  let restarted = false;        // ICE restart maksimal sekali
  let handlers = {}; // { onRemoteStream, onData, onChannelOpen, onConnected, onDisconnected }

  async function getCamera() {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: false,
    });
    return localStream;
  }

  function createPeer(isHost) {
    isHostRole = isHost;
    restarted = false;
    pendingCandidates = [];
    pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 2 });

    for (const track of localStream.getTracks()) pc.addTrack(track, localStream);

    pc.ontrack = (e) => handlers.onRemoteStream && handlers.onRemoteStream(e.streams[0]);

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      console.log("[rtc] connectionState:", st);
      if (st === "connected") {
        capBitrate(); // hemat kuota TURN
        handlers.onConnected && handlers.onConnected();
      }
      if (st === "failed") {
        // coba selamatkan sekali dengan ICE restart sebelum menyerah
        if (isHostRole && !restarted) { restarted = true; iceRestart(); return; }
        handlers.onDisconnected && handlers.onDisconnected("failed");
      } else if (st === "disconnected" || st === "closed") {
        handlers.onDisconnected && handlers.onDisconnected(st);
      }
    };

    pc.oniceconnectionstatechange = () =>
      console.log("[rtc] iceConnectionState:", pc.iceConnectionState);

    const myRole = isHost ? "host" : "guest";
    const theirRole = isHost ? "guest" : "host";
    pc.onicecandidate = (e) => {
      if (e.candidate) Signaling.sendCandidate(myRole, e.candidate.toJSON());
    };
    // Candidate masuk: kalau remote description belum ada, ANTRE dulu (jangan dibuang!)
    Signaling.onCandidate(theirRole, (cand) => {
      if (pc.remoteDescription && pc.remoteDescription.type) {
        pc.addIceCandidate(new RTCIceCandidate(cand)).catch((err) => console.warn("addIce", err));
      } else {
        pendingCandidates.push(cand);
      }
    });

    if (isHost) {
      dataChannel = pc.createDataChannel("sync");
      wireChannel();
    } else {
      pc.ondatachannel = (e) => { dataChannel = e.channel; wireChannel(); };
    }
  }

  // Terapkan semua candidate yang tadi diantre (dipanggil setelah setRemoteDescription)
  async function flushCandidates() {
    const queued = pendingCandidates;
    pendingCandidates = [];
    for (const cand of queued) {
      try { await pc.addIceCandidate(new RTCIceCandidate(cand)); }
      catch (err) { console.warn("flushIce", err); }
    }
  }

  function wireChannel() {
    dataChannel.onmessage = (e) => {
      try { handlers.onData && handlers.onData(JSON.parse(e.data)); } catch (_) {}
    };
    dataChannel.onopen = () => {
      for (const msg of pendingSends) dataChannel.send(msg);
      pendingSends = [];
      handlers.onChannelOpen && handlers.onChannelOpen();
    };
    if (dataChannel.readyState === "open") dataChannel.onopen();
  }

  // Host memulai: buat offer, tunggu answer
  async function startAsHost() {
    createPeer(true);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await Signaling.sendOffer(pc.localDescription);
    Signaling.onAnswer(async (answer) => {
      // terima answer baru (termasuk hasil ICE restart) selama belum stable
      if (pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushCandidates();
      }
    });
  }

  // Guest: ambil offer, balas answer (bisa dipanggil ulang saat host ICE restart)
  async function startAsGuest() {
    createPeer(false);
    let lastOfferSdp = null;
    Signaling.onOffer(async (offer) => {
      if (offer.sdp === lastOfferSdp) return;      // offer yang sama, abaikan
      if (pc.signalingState !== "stable" && lastOfferSdp) return;
      lastOfferSdp = offer.sdp;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await flushCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await Signaling.sendAnswer(pc.localDescription);
    });
  }

  // ICE restart: bikin offer baru dgn ICE fresh, kirim ulang lewat signaling
  async function iceRestart() {
    try {
      console.log("[rtc] mencoba ICE restart...");
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      await Signaling.sendOffer(pc.localDescription);
    } catch (err) {
      console.warn("iceRestart gagal", err);
      handlers.onDisconnected && handlers.onDisconnected("failed");
    }
  }

  // Batasi bitrate video ~650kbps @24fps — kualitas masih oke buat foto,
  // dan kuota TURN 500MB jadi cukup untuk sesi yang cukup panjang.
  async function capBitrate() {
    if (!pc) return;
    for (const sender of pc.getSenders()) {
      if (!sender.track || sender.track.kind !== "video") continue;
      try {
        const p = sender.getParameters();
        if (!p.encodings || !p.encodings.length) p.encodings = [{}];
        p.encodings[0].maxBitrate = 650000;
        p.encodings[0].maxFramerate = 24;
        await sender.setParameters(p);
      } catch (err) { console.warn("capBitrate", err); }
    }
  }

  function send(obj) {
    const msg = JSON.stringify(obj);
    if (dataChannel && dataChannel.readyState === "open") {
      dataChannel.send(msg);
    } else if (pc) {
      pendingSends.push(msg);
    }
  }

  function close() {
    pendingSends = [];
    pendingCandidates = [];
    if (dataChannel) { try { dataChannel.close(); } catch (_) {} dataChannel = null; }
    if (pc) { try { pc.close(); } catch (_) {} pc = null; }
    if (localStream) {
      for (const t of localStream.getTracks()) t.stop();
      localStream = null;
    }
  }

  return {
    getCamera, startAsHost, startAsGuest, send, close,
    on: (h) => Object.assign(handlers, h),
    get localStream() { return localStream; },
  };
})();
