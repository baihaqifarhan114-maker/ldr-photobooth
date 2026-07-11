// Koneksi WebRTC peer-to-peer: video dua arah + data channel untuk sinkronisasi.

const Rtc = (() => {
  let pc = null;
  let dataChannel = null;
  let localStream = null;
  let handlers = {}; // { onRemoteStream, onData, onConnected, onDisconnected }

  async function getCamera() {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: false,
    });
    return localStream;
  }

  function createPeer(isHost) {
    pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    for (const track of localStream.getTracks()) pc.addTrack(track, localStream);

    pc.ontrack = (e) => handlers.onRemoteStream && handlers.onRemoteStream(e.streams[0]);

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") handlers.onConnected && handlers.onConnected();
      if (["disconnected", "failed", "closed"].includes(pc.connectionState))
        handlers.onDisconnected && handlers.onDisconnected(pc.connectionState);
    };

    const myRole = isHost ? "host" : "guest";
    const theirRole = isHost ? "guest" : "host";
    pc.onicecandidate = (e) => {
      if (e.candidate) Signaling.sendCandidate(myRole, e.candidate.toJSON());
    };
    Signaling.onCandidate(theirRole, async (cand) => {
      try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (err) { console.warn("ICE err", err); }
    });

    if (isHost) {
      dataChannel = pc.createDataChannel("sync");
      wireChannel();
    } else {
      pc.ondatachannel = (e) => { dataChannel = e.channel; wireChannel(); };
    }
  }

  function wireChannel() {
    dataChannel.onmessage = (e) => {
      try { handlers.onData && handlers.onData(JSON.parse(e.data)); } catch (_) {}
    };
  }

  // Host memulai: buat offer, tunggu answer
  async function startAsHost() {
    createPeer(true);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await Signaling.sendOffer(offer);
    Signaling.onAnswer(async (answer) => {
      if (pc.signalingState !== "stable") {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });
  }

  // Guest: ambil offer, balas answer
  async function startAsGuest() {
    createPeer(false);
    Signaling.onOffer(async (offer) => {
      if (pc.remoteDescription) return;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await Signaling.sendAnswer(answer);
    });
  }

  function send(obj) {
    if (dataChannel && dataChannel.readyState === "open") {
      dataChannel.send(JSON.stringify(obj));
    }
  }

  function close() {
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
