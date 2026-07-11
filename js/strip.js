// Komposisi foto: gabungkan dua video jadi satu foto, lalu susun jadi strip.

const Strip = (() => {
  const FILTERS = {
    normal: "none",
    warm: "sepia(0.25) saturate(1.25) brightness(1.06)",
    cool: "saturate(1.05) brightness(1.04) hue-rotate(15deg)",
    soft: "brightness(1.09) contrast(0.85) saturate(1.12)",
    vintage: "sepia(0.45) contrast(1.05) saturate(1.3) brightness(1.02)",
    sepia: "sepia(0.85) contrast(1.02) brightness(1.03)",
    bw: "grayscale(1) contrast(1.05)",
    noir: "grayscale(1) contrast(1.4) brightness(0.94)",
    pop: "saturate(1.65) contrast(1.15)",
    blur: "blur(7px) brightness(1.08) saturate(1.15)", // tren "kita blur" 🫰
  };

  const FILTER_LABELS = {
    normal: "Normal", warm: "☀️ Warm", cool: "❄️ Cool", soft: "🌷 Soft",
    vintage: "🎞️ Vintage", sepia: "🟤 Sepia", bw: "B&W", noir: "🖤 Noir",
    pop: "🍭 Pop", blur: "🫰 Kita blur",
  };

  // Font caption — key harus cocok dengan chip #ctl-font
  const CAPTION_FONTS = {
    dancing:    { css: '600 64px "Dancing Script", cursive',  dateGap: 44 },
    pacifico:   { css: '54px Pacifico, cursive',              dateGap: 52 },
    yellowtail: { css: '58px Yellowtail, cursive',            dateGap: 46 },
    caveat:     { css: '600 68px Caveat, cursive',            dateGap: 42 },
    bebas:      { css: '62px "Bebas Neue", sans-serif',       dateGap: 46 },
  };

  const DATE_FONT = '500 26px Poppins, sans-serif';
  const THEMES = {
    pink: {
      label: "🌸 Pink", bg: "#F5E6E8", border: "#FFFFFF", borderW: 10,
      captionColor: "#993556", dateColor: "#C97A93", dateFont: DATE_FONT,
      deco: "♥", decoColor: "#ED93B1",
    },
    lavender: {
      label: "💜 Lavender", bg: "#EEEDFE", border: "#FFFFFF", borderW: 10,
      captionColor: "#3C3489", dateColor: "#7F77DD", dateFont: DATE_FONT,
      deco: "✿", decoColor: "#AFA9EC",
    },
    mint: {
      label: "🍃 Mint", bg: "#E1F5EE", border: "#FFFFFF", borderW: 10,
      captionColor: "#085041", dateColor: "#1D9E75", dateFont: DATE_FONT,
      deco: "♡", decoColor: "#5DCAA5",
    },
    sky: {
      label: "🩵 Sky", bg: "#E6F1FB", border: "#FFFFFF", borderW: 10,
      captionColor: "#185FA5", dateColor: "#7FA8CC", dateFont: DATE_FONT,
      deco: "♡", decoColor: "#85B7EB",
    },
    cream: {
      label: "🌼 Cream", bg: "#FBF6EC", border: "#FFFFFF", borderW: 10,
      captionColor: "#8A6B3F", dateColor: "#BBA37E", dateFont: DATE_FONT,
      deco: "✿", decoColor: "#E8C766",
    },
    kraft: {
      label: "📦 Kraft", bg: "#E5D5B7", border: "#FFF9EE", borderW: 10,
      captionColor: "#5F4522", dateColor: "#96794D", dateFont: DATE_FONT,
      deco: "✦", decoColor: "#B98A4E",
    },
    love: {
      label: "❤️ Love", bg: "#7A1F2B", border: "#F5E6E8", borderW: 10,
      captionColor: "#FFE3EA", dateColor: "#E89AAD", dateFont: DATE_FONT,
      deco: "♥", decoColor: "#E86A8A",
    },
    midnight: {
      label: "🌙 Midnight", bg: "#1C2340", border: "#2E3860", borderW: 8,
      captionColor: "#E8ECFF", dateColor: "#8FA0D9", dateFont: DATE_FONT,
      deco: "✧", decoColor: "#6E82C9",
    },
    film: {
      label: "🎞️ Film", bg: "#1E1E1E", border: "#111111", borderW: 6,
      captionColor: "#F5F0E8", dateColor: "#B8B2A6", dateFont: DATE_FONT,
      deco: null, sprockets: true,
    },
    polaroid: {
      label: "🤍 Polaroid", bg: "#FFFFFF", border: "#F1EFE8", borderW: 8,
      captionColor: "#4A3540", dateColor: "#A9939E", dateFont: DATE_FONT,
      deco: null,
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

  // Foto dummy (siluet) untuk live preview sebelum sesi foto
  function makePlaceholderPhoto(w, h, filterKey, solo) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.filter = FILTERS[filterKey] || "none";

    function person(cx, baseY, r) {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath(); ctx.arc(cx, baseY - r * 1.7, r, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, baseY + r * 0.9, r * 1.55, r * 1.25, 0, Math.PI, 0); ctx.fill();
    }

    if (solo) {
      ctx.fillStyle = "#EFC3D2"; ctx.fillRect(0, 0, w, h);
      person(w / 2, h * 0.72, h * 0.17);
    } else {
      const half = w / 2;
      ctx.fillStyle = "#EFC3D2"; ctx.fillRect(0, 0, half, h);
      ctx.fillStyle = "#BCD7F2"; ctx.fillRect(half, 0, half, h);
      person(half * 0.5, h * 0.72, h * 0.16);
      person(half * 1.5, h * 0.72, h * 0.16);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(half - 2, 0, 4, h);
    }
    ctx.filter = "none";
    return c;
  }

  function previewStrip({ layout, theme, filter, captionFont, solo }, caption, showDate) {
    const L = LAYOUTS[layout];
    const photo = makePlaceholderPhoto(L.photoW, L.photoH, filter, solo);
    const photos = Array.from({ length: L.shots }, () => photo);
    return composeStrip(photos, { layout, theme, caption, showDate, captionFont });
  }

  return { FILTERS, FILTER_LABELS, THEMES, LAYOUTS, CAPTION_FONTS, capturePhoto, composeStrip, previewStrip };
})();
