const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");

/** RNG determinístico (para que los destellos siempre salgan igual para el mismo número) */
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

/** Textura metálica procedural */
function makeMetalNoise(w, h, seed = 12345) {
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

  // “brushed” horizontal (cepillado)
  ctx.save();
  ctx.globalAlpha = 0.10;
  for (let y = 0; y < h; y += 5) {
    ctx.fillStyle = y % 10 === 0 ? "#000" : "#fff";
    ctx.fillRect(0, y, w, 1);
  }
  ctx.restore();

  return c;
}

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

function buildGoldFillLayer(w, h, maskCanvas, y, fontSize, seed) {
  const layer = createCanvas(w, h);
  const g = layer.getContext("2d");

  // Base oro (vertical) + zonas calientes
  const grad = g.createLinearGradient(0, y - fontSize * 1.1, 0, y + fontSize * 1.1);
  grad.addColorStop(0.00, "#FFF7D1");
  grad.addColorStop(0.16, "#FFE08A");
  grad.addColorStop(0.35, "#F2C24A");
  grad.addColorStop(0.55, "#D79A18");
  grad.addColorStop(0.72, "#B87408");
  grad.addColorStop(0.86, "#FFD97A");
  grad.addColorStop(1.00, "#FFF2B8");

  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);

  // Textura metal
  g.save();
  g.globalAlpha = 0.30;
  g.globalCompositeOperation = "overlay";
  const noise = makeMetalNoise(w, h, seed ^ 0xA5A5);
  g.drawImage(noise, 0, 0);
  g.restore();

  // Highlight especular arriba (efecto brillo)
  g.save();
  g.globalCompositeOperation = "screen";
  g.globalAlpha = 0.55;
  const hi = g.createLinearGradient(0, y - fontSize * 0.95, 0, y + fontSize * 0.25);
  hi.addColorStop(0.0, "rgba(255,255,255,0.95)");
  hi.addColorStop(0.55, "rgba(255,255,255,0.18)");
  hi.addColorStop(1.0, "rgba(255,255,255,0)");
  g.fillStyle = hi;
  g.fillRect(0, y - fontSize * 0.95, w, fontSize * 1.25);
  g.restore();

  // Recorte al texto
  g.save();
  g.globalCompositeOperation = "destination-in";
  g.drawImage(maskCanvas, 0, 0);
  g.restore();

  return layer;
}

/** Dibuja un destello tipo “estrella” */
function drawSparkle(ctx, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy);

  // glow central
  const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
  rg.addColorStop(0, "rgba(255,255,255,0.95)");
  rg.addColorStop(0.35, "rgba(255,240,170,0.65)");
  rg.addColorStop(1, "rgba(255,220,90,0)");
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();

  // cruz (4 puntas)
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = Math.max(1, size * 0.12);
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-size * 1.2, 0);
  ctx.lineTo(size * 1.2, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -size * 1.2);
  ctx.lineTo(0, size * 1.2);
  ctx.stroke();

  // diagonales suaves
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(-size * 0.85, -size * 0.85);
  ctx.lineTo(size * 0.85, size * 0.85);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(size * 0.85, -size * 0.85);
  ctx.lineTo(-size * 0.85, size * 0.85);
  ctx.stroke();

  ctx.restore();
}

/** Render completo estilo “imagen 2” */
async function drawGolden3DText({
  ctx,
  w,
  h,
  text,
  x,
  y,
  font,
  fontSize,
  seed,
}) {
  // Máscara y fill oro
  const mask = makeTextMask(w, h, text, font, x, y);
  const goldFill = buildGoldFillLayer(w, h, mask, y, fontSize, seed);

  // 1) Glow exterior dorado (como halo)
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.shadowColor = "rgba(255, 200, 40, 0.80)";
  ctx.shadowBlur = Math.max(18, Math.floor(w * 0.02));
  ctx.drawImage(goldFill, 0, 0);
  ctx.restore();

  // 2) Extrusión 3D (capas hacia abajo/derecha)
  const depth = Math.max(18, Math.floor(w * 0.02)); // ajusta “3D”
  for (let i = depth; i >= 1; i--) {
    const t = i / depth;

    // tono lateral más oscuro
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.globalCompositeOperation = "source-over";

    ctx.shadowBlur = 0;
    ctx.filter = "none";

    // oscurecemos un poco con un overlay simple
    ctx.drawImage(goldFill, i * 0.65, i * 0.85);

    // “sombra” que cae más abajo
    if (i === depth) {
      ctx.globalAlpha = 0.35;
      ctx.shadowColor = "rgba(0,0,0,0.75)";
      ctx.shadowBlur = Math.max(16, Math.floor(w * 0.02));
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = Math.max(14, Math.floor(h * 0.02));
      ctx.drawImage(goldFill, i * 0.65, i * 0.85);
    }

    // degradado oscuro encima (para que se sienta “lado”)
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.30 * (0.6 + (1 - t) * 0.8);
    ctx.fillStyle = "#6B3E00";
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  // 3) Cara frontal (oro principal)
  ctx.drawImage(goldFill, 0, 0);

  // 4) Bisel / borde exterior brillante + borde interno
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = font;

  // borde oscuro base
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = Math.max(10, Math.floor(w * 0.016));
  ctx.strokeStyle = "rgba(60, 30, 0, 0.90)";
  ctx.strokeText(text, x, y);

  // borde dorado brillante
  ctx.lineWidth = Math.max(6, Math.floor(w * 0.010));
  ctx.strokeStyle = "rgba(255, 210, 70, 0.95)";
  ctx.strokeText(text, x, y);

  // highlight arriba-izquierda (bisel)
  ctx.lineWidth = Math.max(4, Math.floor(w * 0.007));
  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.strokeText(text, x - Math.max(2, Math.floor(w * 0.002)), y - Math.max(2, Math.floor(h * 0.002)));

  // sombra interna abajo-derecha
  ctx.globalCompositeOperation = "multiply";
  ctx.lineWidth = Math.max(5, Math.floor(w * 0.008));
  ctx.strokeStyle = "rgba(120, 70, 0, 0.35)";
  ctx.strokeText(text, x + Math.max(2, Math.floor(w * 0.002)), y + Math.max(2, Math.floor(h * 0.002)));

  ctx.restore();

  // 5) Destellos “sparkles” encima del texto (como la imagen 2)
  const rnd = mulberry32(seed ^ 0x55CCAA);
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  const sparkleCount = 8; // sube/baja si quieres
  for (let i = 0; i < sparkleCount; i++) {
    const px = x + (rnd() - 0.5) * (w * 0.55);
    const py = y + (rnd() - 0.6) * (h * 0.25);
    const s = (0.012 + rnd() * 0.020) * w; // tamaño relativo
    drawSparkle(ctx, px, py, s);
  }

  // un destello fuerte cerca del centro-arriba
  drawSparkle(ctx, x + w * 0.02, y - fontSize * 0.55, w * 0.030);
  ctx.restore();
}

module.exports = async (req, res) => {
  try {
    // 1) Lee num o numero (4 dígitos, rellena con ceros)
    const raw = String(req.query.num ?? req.query.numero ?? "")
      .replace(/\D/g, "")
      .slice(0, 4);

    const numero = raw.padStart(4, "0");

    // 2) Fondo (diamante)
    const baseImageUrl = process.env.BASE_DIAMOND_URL;
    if (!baseImageUrl) {
      res.status(500).send("Falta BASE_DIAMOND_URL");
      return;
    }

    // 3) Fuente (obligatorio tener el .ttf dentro del repo)
    const fontPath = path.join(process.cwd(), "fonts", "Montserrat-Bold.ttf");
    registerFont(fontPath, { family: "Montserrat", weight: "bold" });

    const img = await loadImage(baseImageUrl);

    // Canvas transparente (si el PNG del diamante tiene transparencia, se conserva)
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    // Dibuja diamante
    ctx.drawImage(img, 0, 0);

    // Config texto
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Tamaño/posicion como “imagen 2”
    const fontSize = Math.floor(img.width * 0.26); // ajusta si lo quieres más grande
    const font = `900 ${fontSize}px "Montserrat"`;

    const x = img.width / 2;
    const y = img.height / 2 + Math.floor(img.height * 0.12);

    // Seed determinístico
    const seed = hashSeed(numero);

    // Render oro 3D + destellos
    await drawGolden3DText({
      ctx,
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
