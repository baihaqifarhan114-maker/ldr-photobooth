// Komposisi foto: gabungkan dua video jadi satu foto, lalu susun jadi strip.

const Strip = (() => {
  const FILTERS = {
    normal: "none",
    bw: "grayscale(1) contrast(1.05)",
    vintage: "sepia(0.45) contrast(1.05) saturate(1.3) brightness(1.02)",
    blur: "blur(7px) brightness(1.08) saturate(1.15)", // tren "kita blur" 🫰
  };

  // Font caption — key harus cocok dengan chip #ctl-font
  const CAPTION_FONTS = {
    dancing:    { css: '600 64px "Dancing Script", cursive',  dateGap: 44 },
    pacifico:   { css: '54px Pacifico, cursive',              dateGap: 52 },
    yellowtail: { css: '58px Yellowtail, cursive',            dateGap: 46 },
    caveat:     { css: '600 68px Caveat, cursive',            dateGap: 42 },
    bebas:      { css: '62px "Bebas Neue", sans-serif',       dateGap: 46 },
  };

  const THEMES = {
    pink: {
      bg: "#F5E6E8", border: "#FFFFFF", borderW: 10,
      captionColor: "#993556", dateColor: "#C97A93",
      dateFont: '500 26px Poppins, sans-serif',
      deco: "♥", decoColor: "#ED93B1",
    },
    film: {
      bg: "#1E1E1E", border: "#111111", borderW: 6,
      captionColor: "#F5F0E8", dateColor: "#B8B2A6",
      dateFont: '500 26px Poppins, sans-serif',
      deco: null, sprockets: true,
    },
    cream: {
      bg: "#FBF6EC", border: "#FFFFFF", borderW: 10,
      captionColor: "#8A6B3F", dateColor: "#BBA37E",
      dateFont: '500 26px Poppins, sans-serif',
      deco: "✿", decoColor: "#E8C766",
    },
    sky: {
      bg: "#E6F1FB", border: "#FFFFFF", borderW: 10,
      captionColor: "#185FA5", dateColor: "#7FA8CC",
      dateFont: '500 26px Poppins, sans-serif',
      deco: "♡", decoColor: "#85B7EB",
    },
  };

  const LAYOUTS = {
    strip4: { shots: 4, cols: 1, photoW: 760, photoH: 507 },
    strip3: { shots: 3, cols: 1, photoW: 760, photoH: 507 },
    grid2x2: { shots: 4, cols: 2, photoW: 600, photoH: 400 },
  };

  const PAD = 56, GAP = 28, CAPTION_H = 170;

  // Gambar video ke area target: cover-crop + mirror (gaya selfie)
  function drawVideoCover(ctx, video, dx, dy, dw, dh) {
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) { ctx.fillStyle = "#333"; ctx.fillRect(dx, dy, dw, dh); return; }
    const scale = Math.max(dw / vw, dh / vh);
    const sw = dw / scale, sh = dh / scale;
    const sx = (vw - sw) / 2, sy = (vh - sh) / 2;
    ctx.save();
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);
    ctx.restore();
  }

  // Satu jepretan: dua wajah berdampingan, atau satu wajah full (solo, videoRight=null)
  function capturePhoto(videoLeft, videoRight, filterKey, w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.filter = FILTERS[filterKey] || "none";
    if (videoRight) {
      const half = w / 2;
      drawVideoCover(ctx, videoLeft, 0, 0, half, h);
      drawVideoCover(ctx, videoRight, half, 0, half, h);
      ctx.filter = "none";
      // garis pemisah tipis
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(half - 2, 0, 4, h);
    } else {
      drawVideoCover(ctx, videoLeft, 0, 0, w, h);
      ctx.filter = "none";
    }
    return c;
  }

  function drawSprockets(ctx, W, H) {
    ctx.fillStyle = "#000";
    const holeW = 22, holeH = 30, step = 62;
    for (let y = 20; y < H - 40; y += step) {
      ctx.beginPath(); ctx.roundRect(14, y, holeW, holeH, 6); ctx.fill();
      ctx.beginPath(); ctx.roundRect(W - 14 - holeW, y, holeW, holeH, 6); ctx.fill();
    }
  }

  // Susun foto-foto jadi strip final
  function composeStrip(photos, { layout, theme, caption, showDate, captionFont }) {
    const L = LAYOUTS[layout], T = THEMES[theme];
    const rows = Math.ceil(L.shots / L.cols);
    const sidePad = T.sprockets ? PAD + 24 : PAD;
    const W = sidePad * 2 + L.cols * L.photoW + (L.cols - 1) * GAP;
    const capH = caption || showDate ? CAPTION_H : PAD;
    const H = PAD + rows * L.photoH + (rows - 1) * GAP + capH + (T.sprockets ? 20 : 0);

    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");

    ctx.fillStyle = T.bg;
    ctx.fillRect(0, 0, W, H);
    if (T.sprockets) drawSprockets(ctx, W, H);

    photos.forEach((photo, i) => {
      const col = i % L.cols, row = Math.floor(i / L.cols);
      const x = sidePad + col * (L.photoW + GAP);
      const y = PAD + row * (L.photoH + GAP);
      if (T.borderW) {
        ctx.fillStyle = T.border;
        ctx.fillRect(x - T.borderW, y - T.borderW, L.photoW + T.borderW * 2, L.photoH + T.borderW * 2);
      }
      ctx.drawImage(photo, x, y, L.photoW, L.photoH);
    });

    // caption + tanggal
    const capTop = PAD + rows * L.photoH + (rows - 1) * GAP;
    const F = CAPTION_FONTS[captionFont] || CAPTION_FONTS.dancing;
    ctx.textAlign = "center";
    if (caption) {
      ctx.font = F.css;
      ctx.fillStyle = T.captionColor;
      ctx.fillText(caption, W / 2, capTop + 78, W - sidePad * 2);
    }
    if (showDate) {
      const d = new Date();
      const dateStr = [
        String(d.getDate()).padStart(2, "0"),
        String(d.getMonth() + 1).padStart(2, "0"),
        d.getFullYear(),
      ].join(".");
      ctx.font = T.dateFont;
      ctx.fillStyle = T.dateColor;
      ctx.fillText(dateStr, W / 2, capTop + (caption ? 78 + F.dateGap : 70));
    }

    // dekorasi sudut
    if (T.deco) {
      ctx.font = "42px serif";
      ctx.fillStyle = T.decoColor;
      ctx.fillText(T.deco, sidePad / 2 + 6, PAD + 20);
      ctx.fillText(T.deco, W - sidePad / 2 - 6, PAD + 20);
      ctx.fillText(T.deco, sidePad / 2 + 6, H - 40);
      ctx.fillText(T.deco, W - sidePad / 2 - 6, H - 40);
    }

    return c;
  }

  return { FILTERS, THEMES, LAYOUTS, CAPTION_FONTS, capturePhoto, composeStrip };
})();
