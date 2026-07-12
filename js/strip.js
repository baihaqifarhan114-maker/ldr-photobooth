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

  // ---------- pattern & aset ----------
  const IMAGES = {};
  function loadAssets() {
    for (const t of Object.values(THEMES)) {
      if (t.logo && !IMAGES[t.logo]) {
        const img = new Image();
        img.src = t.logo;
        IMAGES[t.logo] = img;
      }
    }
  }

  // pseudo-random deterministik biar preview stabil
  const prand = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  function scatterEmoji(ctx, W, H, chars, count, minSize, maxSize, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let i = 0; i < count; i++) {
      const size = minSize + prand(i * 3) * (maxSize - minSize);
      const x = prand(i * 3 + 1) * W;
      const y = prand(i * 3 + 2) * H;
      ctx.font = `${Math.round(size)}px serif`;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((prand(i * 7) - 0.5) * 0.9);
      ctx.fillText(chars[i % chars.length], 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  function confettiDots(ctx, W, H, colors, count) {
    ctx.save();
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = 0.5 + prand(i) * 0.5;
      const r = 3 + prand(i * 5) * 6;
      ctx.beginPath();
      ctx.arc(prand(i * 3 + 1) * W, prand(i * 3 + 2) * H, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function diagStripes(ctx, W, H, color, alpha, gap, w) {
    ctx.save();
    ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = w;
    for (let x = -H; x < W + H; x += gap) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.stroke();
    }
    ctx.restore();
  }

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
    // ---- template 2x6 style ----
    gold: {
      label: "🖤 Black & Gold", bg: "#141210", border: "#C9A227", borderW: 6,
      captionColor: "#E8C766", dateColor: "#9C824A", dateFont: DATE_FONT,
      deco: null,
      pattern: (ctx, W, H) => confettiDots(ctx, W, H, ["#C9A227", "#E8C766", "#7A6420"], 90),
    },
    rosegold: {
      label: "🩷 Rose Gold", bg: "#F7E7E4", border: "#FFFFFF", borderW: 10,
      captionColor: "#B76E79", dateColor: "#C99CA3", dateFont: DATE_FONT,
      deco: null,
      pattern: (ctx, W, H) => { confettiDots(ctx, W, H, ["#B76E79", "#E3B7BD", "#D8A48F"], 70); scatterEmoji(ctx, W, H, ["✨"], 14, 20, 34, 0.8); },
    },
    newspaper: {
      label: "📰 Newspaper", bg: "#F4EFE4", border: "#1E1C18", borderW: 5,
      captionColor: "#1E1C18", dateColor: "#6B655A", dateFont: '500 26px "Courier New", monospace',
      deco: null,
      pattern: (ctx, W, H) => {
        ctx.save(); ctx.globalAlpha = 0.10; ctx.fillStyle = "#1E1C18";
        ctx.font = "16px Georgia, serif";
        for (let y = 20; y < H; y += 26)
          ctx.fillText("THE DAILY US • EXTRA! EXTRA! • LOVE NEWS • ".repeat(4), -(y % 60), y);
        ctx.restore();
      },
    },
    tropical: {
      label: "🌴 Tropical", bg: "#DFF3EC", border: "#FFFFFF", borderW: 10,
      captionColor: "#0B6B4F", dateColor: "#4FA98B", dateFont: DATE_FONT,
      deco: null,
      pattern: (ctx, W, H) => scatterEmoji(ctx, W, H, ["🌴", "🌺", "🍍", "🌊"], 26, 26, 46, 0.9),
    },
    cherry: {
      label: "🍒 Cherry", bg: "#FFF3EE", border: "#FFFFFF", borderW: 10,
      captionColor: "#B3232A", dateColor: "#D98A8E", dateFont: DATE_FONT,
      deco: null,
      pattern: (ctx, W, H) => scatterEmoji(ctx, W, H, ["🍒", "🍓", "🎀"], 24, 24, 42, 0.9),
    },
    manutd: {
      label: "🔴 Man United", bg: "#B80007", border: "#FFFFFF", borderW: 8,
      captionColor: "#FBE122", dateColor: "#FFD9DB", dateFont: DATE_FONT,
      deco: null, logo: "assets/mu.webp",
      pattern: (ctx, W, H) => diagStripes(ctx, W, H, "#8F0005", 0.6, 46, 16),
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

  // Stiker emoji di pinggiran strip
  function drawStickers(ctx, W, H, chars) {
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let i = 0; i < 16; i++) {
      const side = i % 2;
      const x = side ? W - 24 - prand(i * 13) * 30 : 24 + prand(i * 13) * 30;
      const y = 46 + prand(i * 11 + 5) * (H - 110);
      const size = 30 + prand(i * 17) * 14;
      ctx.font = `${Math.round(size)}px serif`;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((prand(i * 23) - 0.5) * 0.8);
      ctx.fillText(chars[i % chars.length], 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  const STICKER_SETS = {
    none: { label: "Tanpa", chars: null },
    love: { label: "💕 Love", chars: ["💕", "💘", "🫰", "❤️‍🔥"] },
    cute: { label: "🎀 Cute", chars: ["🎀", "🌷", "🧸", "⭐"] },
    party: { label: "🎉 Party", chars: ["🎉", "🎊", "🥳", "✨"] },
    bola: { label: "⚽ Bola", chars: ["⚽", "🔴", "🏆", "🔥"] },
  };

  // Susun foto-foto jadi strip final
  function composeStrip(photos, { layout, theme, caption, showDate, captionFont, stickers }) {
    const L = LAYOUTS[layout], T = THEMES[theme];
    const rows = Math.ceil(L.shots / L.cols);
    const sidePad = T.sprockets ? PAD + 24 : PAD;
    const W = sidePad * 2 + L.cols * L.photoW + (L.cols - 1) * GAP;
    const logoImg = T.logo && IMAGES[T.logo] && IMAGES[T.logo].complete && IMAGES[T.logo].naturalWidth ? IMAGES[T.logo] : null;
    const logoH = logoImg ? 128 : 0;
    const capH = (caption || showDate ? CAPTION_H : PAD) + logoH;
    const H = PAD + rows * L.photoH + (rows - 1) * GAP + capH + (T.sprockets ? 20 : 0);

    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");

    ctx.fillStyle = T.bg;
    ctx.fillRect(0, 0, W, H);
    if (T.pattern) T.pattern(ctx, W, H);
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
    let capTop = PAD + rows * L.photoH + (rows - 1) * GAP;
    if (logoImg) {
      const lh = 112, lw = lh * (logoImg.naturalWidth / logoImg.naturalHeight);
      ctx.drawImage(logoImg, (W - lw) / 2, capTop + 10, lw, lh);
      capTop += logoH;
    }
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

    if (stickers) drawStickers(ctx, W, H, stickers);

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

  function previewStrip({ layout, theme, filter, captionFont, solo, stickers }, caption, showDate) {
    const L = LAYOUTS[layout];
    const photo = makePlaceholderPhoto(L.photoW, L.photoH, filter, solo);
    const photos = Array.from({ length: L.shots }, () => photo);
    return composeStrip(photos, { layout, theme, caption, showDate, captionFont, stickers });
  }

  return { FILTERS, FILTER_LABELS, THEMES, LAYOUTS, CAPTION_FONTS, STICKER_SETS, capturePhoto, composeStrip, previewStrip, loadAssets };
})();
