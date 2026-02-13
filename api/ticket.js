const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");

/** RNG determinístico */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Textura metálica (grano + cepillado) */
function makeMetalTexture(w, h, seed) {
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  const rnd = mulberry32(seed);

  // grano
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(140 + rnd() * 115); // 140..255
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  // cepillado horizontal
  ctx.save();
  ctx.globalAlpha = 0.12;
  for (let y = 0; y < h; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? "#000" : "#fff";
    ctx.fillRect(0, y, w, 1);
  }
  ctx.restore();

  return c;
}

/** Máscara del texto */
function makeTextMask(w, h, text, font, x, y) {
  const mask = createCanvas(w, h);
  const m = mask.getContext("2d");
  m.clearRect(0, 0, w, h);
  m.textAlign = "center";
  m.textBaseline = "middle";
  m.font = font;
  m.fillStyle = "#fff";
  m.fillText(text, x, y);
  return mask;
}

/** Crea capa oro (degradado + textura + highlight) recortada al texto */
function buildGoldFace(w, h, mask, y, fontSize, seed) {
  const layer = createCanvas(w, h);
  const g = layer.getContext("2d");

  // Degradado oro (más “caliente” como la imagen 2)
  const grad = g.createLinearGradient(0, y - fontSize * 1.1, 0, y + fontSize * 1.1);
  grad.addColorStop(0.00, "#FFF7D8");
  grad.addColorStop(0.14, "#FFEAA6");
  grad.addColorStop(0.30, "#F6CC56");
  grad.addColorStop(0.48, "#D79A18");
  grad.addColorStop(0.65, "#B87408");
  grad.addColorStop(0.82, "#FFD57A");
  grad.addColorStop(1.00, "#FFF2B8");

  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);

  // Textura metálica encima
  g.save();
  g.globalCompositeOperation = "overlay";
  g.globalAlpha = 0.32;
  const metal = makeMetalTexture(w, h, seed ^ 0xA5A5);
  g.drawImage(metal, 0, 0);
  g.restore();

  // Highlight superior (specular)
  g.save();
  g.globalCompositeOperation = "screen";
  g.globalAlpha = 0.60;
  const hi = g.createLinearGradient(0, y - fontSize * 0.95, 0, y + fontSize * 0.30);
  hi.addColorStop(0.0, "rgba(255,255,255,0.98)");
  hi.addColorStop(0.55, "rgba(255,255,255,0.18)");
  hi.addColorStop(1.0, "rgba(255,255,255,0)");
  g.fillStyle = hi;
  g.fillRect(0, y - fontSize * 0.95, w, fontSize * 1.30);
  g.restore();

  // Recorte al texto
  g.save();
  g.globalCompositeOperation = "destination-in";
  g.drawImage(mask, 0, 0);
  g.restore();

  return layer;
}

/** Destello tipo “sparkle” */
function drawSparkle(ctx, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy);

  // glow radial
  const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
  rg.addColorStop(0, "rgba(255,255,255,0.98)");
  rg.addColorStop(0.35, "rgba(255,240,170,0.70)");
  rg.addColorStop(1, "rgba(255,220,90,0)");
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();

  // cruz brillante
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = "rgba(255,255,255,0.98)";
  ctx.lineWidth = Math.max(1, size * 0.12);
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-size * 1.4, 0);
  ctx.lineTo(size * 1.4, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -size * 1.4);
  ctx.lineTo(0, size * 1.4);
  ctx.stroke();

  // diagonales suaves
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(-size * 1.05, -size * 1.05);
  ctx.lineTo(size * 1.05, size * 1.05);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(size * 1.05, -size * 1.05);
  ctx.lineTo(-size * 1.05, size * 1.05);
  ctx.stroke();

  ctx.restore();
}

/** Render del número estilo imagen 2: 3D + bisel + glow + destellos */
function drawGoldNumberLikeRef(ctx, {
  w, h, text, x, y, font, fontSize, seed,
}) {
  const mask = makeTextMask(w, h, text, font, x, y);
  const goldFace = buildGoldFace(w, h, mask, y, fontSize, seed);

  // === 0) Halo dorado general (glow alrededor) ===
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.shadowColor = "rgba(255, 190, 45, 0.85)";
  ctx.shadowBlur = Math.max(26, Math.floor(w * 0.028));
  ctx.drawImage(goldFace, 0, 0);
  ctx.restore();

  // === 1) Extrusión 3D (profundidad hacia abajo/derecha) ===
  const depth = Math.max(22, Math.floor(w * 0.026)); // MÁS profundidad como la ref
  for (let i = depth; i >= 1; i--) {
    const dx = i * 0.75;
    const dy = i * 0.95;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.98;

    // Base del “lado” (oscurecer)
    ctx.drawImage(goldFace, dx, dy);

    // oscurecido controlado para que parezca lateral
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#5A2E00";
    ctx.fillRect(0, 0, w, h);

    // sombra proyectada (solo en la última capa)
    if (i === depth) {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.35;
      ctx.shadowColor = "rgba(0,0,0,0.80)";
      ctx.shadowBlur = Math.max(22, Math.floor(w * 0.03));
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = Math.max(18, Math.floor(h * 0.03));
      ctx.drawImage(goldFace, dx, dy);
    }

    ctx.restore();
  }

  // === 2) Borde exterior oscuro (marco 3D) ===
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = font;
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = Math.max(10, Math.floor(w * 0.014));
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.max(8, Math.floor(h * 0.012));
  ctx.lineWidth = Math.max(14, Math.floor(w * 0.020));
  ctx.strokeStyle = "rgba(35,15,0,0.95)";
  ctx.strokeText(text, x, y);
  ctx.restore();

  // === 3) Cara frontal (oro principal) ===
  ctx.drawImage(goldFace, 0, 0);

  // === 4) Bisel (borde dorado brillante) ===
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = font;
  ctx.lineJoin = "round";

  // borde dorado fuerte
  const strokeGrad = ctx.createLinearGradient(0, y - fontSize * 0.7, 0, y + fontSize * 0.9);
  strokeGrad.addColorStop(0.0, "rgba(255,255,255,0.95)");
  strokeGrad.addColorStop(0.35, "rgba(255,215,90,0.95)");
  strokeGrad.addColorStop(0.70, "rgba(200,120,15,0.90)");
  strokeGrad.addColorStop(1.0, "rgba(255,230,120,0.90)");

  ctx.lineWidth = Math.max(10, Math.floor(w * 0.014));
  ctx.strokeStyle = strokeGrad;
  ctx.strokeText(text, x, y);
  ctx.restore();

  // === 5) Highlight superior (bisel claro) + sombra interna inferior ===
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = font;
  ctx.lineJoin = "round";

  // highlight arriba-izquierda
  ctx.globalCompositeOperation = "screen";
  ctx.lineWidth = Math.max(6, Math.floor(w * 0.010));
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.strokeText(text, x - Math.floor(w * 0.002), y - Math.floor(h * 0.002));

  // sombra interna abajo-derecha
  ctx.globalCompositeOperation = "multiply";
  ctx.lineWidth = Math.max(6, Math.floor(w * 0.010));
  ctx.strokeStyle = "rgba(120,70,0,0.25)";
  ctx.strokeText(text, x + Math.floor(w * 0.002), y + Math.floor(h * 0.002));
  ctx.restore();

  // === 6) Brillos puntuales / destellos sobre el número ===
  const rnd = mulberry32(seed ^ 0x55ccaa);
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  // (A) varios destellos alrededor del texto
  const sparkleCount = 10; // más como la ref
  for (let i = 0; i < sparkleCount; i++) {
    const px = x + (rnd() - 0.5) * (w * 0.55);
    const py = y + (rnd() - 0.65) * (h * 0.28);
    const s = (0.012 + rnd() * 0.022) * w;
    drawSparkle(ctx, px, py, s);
  }

  // (B) destello fuerte central-arriba (como la ref)
  drawSparkle(ctx, x + w * 0.01, y - fontSize * 0.62, w * 0.034);

  ctx.restore();
}

module.exports = async (req, res) => {
  try {
    // 1) Lee num o numero
    const raw = String(req.query.num ?? req.query.numero ?? "")
      .replace(/\D/g, "")
      .slice(0, 4);

    const numero = raw.padStart(4, "0");

    // 2) Fondo diamante
    const baseImageUrl = process.env.BASE_DIAMOND_URL;
    if (!baseImageUrl) {
      res.status(500).send("Falta BASE_DIAMOND_URL");
      return;
    }

    // 3) Fuente (usa una serif gruesa similar a la referencia)
    // Recomendadas: Cinzel-Bold.ttf, PlayfairDisplay-Black.ttf, Merriweather-Black.ttf
    const fontPath = path.join(process.cwd(), "fonts", "TuFuenteSerif-Bold.ttf");
    registerFont(fontPath, { family: "GoldFont", weight: "bold" });

    const img = await loadImage(baseImageUrl);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    // Fondo
    ctx.drawImage(img, 0, 0);

    // === Tamaño y posición como tu imagen de referencia ===
    // En la ref, el número ocupa gran parte del ancho del diamante y va un poco abajo del centro.
    const fontSize = Math.floor(img.width * 0.285); // clave para que quede “grande” como la ref
    const font = `900 ${fontSize}px "GoldFont"`;

    const x = img.width / 2;
    const y = Math.floor(img.height * 0.60); // clave para caer en el “cuerpo” inferior del diamante

    // Seed para que destellos sean estables por número
    const seed = hashSeed(numero);

    // Render estilo imagen 2
    drawGoldNumberLikeRef(ctx, {
      w: img.width,
      h: img.height,
      text: numero,
      x,
      y,
      font,
      fontSize,
      seed,
    });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(canvas.toBuffer("image/png"));
  } catch (e) {
    console.error(e);
    res.status(500).send("Error generando imagen");
  }
};
