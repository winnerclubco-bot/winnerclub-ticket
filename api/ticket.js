const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoiseTexture(w, h, seed = 12345) {
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  const rnd = mulberry32(seed);

  // ruido suave (grano metálico)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(160 + rnd() * 95); // 160..255
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  // unas bandas sutiles horizontales para “cepillado”
  ctx.globalAlpha = 0.10;
  for (let y = 0; y < h; y += 6) {
    ctx.fillStyle = y % 12 === 0 ? "#000" : "#fff";
    ctx.fillRect(0, y, w, 2);
  }
  ctx.globalAlpha = 1;

  return c;
}

async function buildGoldTextLayer({ w, h, textMaskCanvas, x, y, fontSize, textureImg }) {
  const gold = createCanvas(w, h);
  const g = gold.getContext("2d");

  // Degradado oro (vertical) + un toque de “brillo” arriba
  const grad = g.createLinearGradient(0, y - fontSize, 0, y + fontSize);
  grad.addColorStop(0.00, "#FFF7CC");
  grad.addColorStop(0.20, "#F7D36A");
  grad.addColorStop(0.45, "#D9A21E");
  grad.addColorStop(0.70, "#B27710");
  grad.addColorStop(0.85, "#F3D37B");
  grad.addColorStop(1.00, "#FFF2B5");

  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);

  // Textura: si hay imagen, úsala; si no, noise procedural
  g.save();
  g.globalAlpha = 0.30;
  g.globalCompositeOperation = "overlay";

  if (textureImg) {
    const pattern = g.createPattern(textureImg, "repeat");
    g.fillStyle = pattern;
    g.fillRect(0, 0, w, h);
  } else {
    const noise = makeNoiseTexture(w, h, 98765);
    g.drawImage(noise, 0, 0);
  }
  g.restore();

  // Brillo superior (specular highlight)
  g.save();
  g.globalAlpha = 0.35;
  g.globalCompositeOperation = "screen";
  const hi = g.createLinearGradient(0, y - fontSize * 0.9, 0, y + fontSize * 0.2);
  hi.addColorStop(0.0, "rgba(255,255,255,0.95)");
  hi.addColorStop(0.6, "rgba(255,255,255,0.15)");
  hi.addColorStop(1.0, "rgba(255,255,255,0)");
  g.fillStyle = hi;
  g.fillRect(0, y - fontSize * 0.95, w, fontSize * 1.2);
  g.restore();

  // Recorta el oro al texto (máscara alpha)
  g.save();
  g.globalCompositeOperation = "destination-in";
  g.drawImage(textMaskCanvas, 0, 0);
  g.restore();

  return gold;
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

    // 3) Fuente
    const fontPath = path.join(process.cwd(), "fonts", "Montserrat-Bold.ttf");
    registerFont(fontPath, { family: "Montserrat", weight: "bold" });

    // (Opcional) textura oro
    const goldTextureUrl = process.env.GOLD_TEXTURE_URL; // opcional
    const goldTextureImg = goldTextureUrl ? await loadImage(goldTextureUrl) : null;

    const img = await loadImage(baseImageUrl);

    // Canvas transparente por defecto
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    // Dibuja diamante
    ctx.drawImage(img, 0, 0);

    // Texto
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Ajusta tamaño (en tu imagen oro es más grande que el blanco)
    const fontSize = Math.floor(img.width * 0.30);
    ctx.font = `900 ${fontSize}px "Montserrat"`;

    const x = img.width / 2;
    const y = img.height / 2 + Math.floor(img.height * 0.12);

    // --- 1) Máscara del texto ---
    const mask = createCanvas(img.width, img.height);
    const m = mask.getContext("2d");
    m.textAlign = "center";
    m.textBaseline = "middle";
    m.font = ctx.font;
    m.fillStyle = "#FFFFFF";
    m.fillText(numero, x, y);

    // --- 2) Capa oro recortada al texto ---
    const goldLayer = await buildGoldTextLayer({
      w: img.width,
      h: img.height,
      textMaskCanvas: mask,
      x,
      y,
      fontSize,
      textureImg: goldTextureImg,
    });

    // --- 3) Sombra detrás del número ---
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.60)";
    ctx.shadowBlur = Math.max(12, Math.floor(img.width * 0.015));
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.max(10, Math.floor(img.height * 0.012));
    ctx.drawImage(goldLayer, 0, 0);
    ctx.restore();

    // --- 4) Marco exterior oscuro (como “borde” del número) ---
    ctx.save();
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.font = `900 ${fontSize}px "Montserrat"`;
    ctx.lineWidth = Math.max(10, Math.floor(img.width * 0.016));
    ctx.strokeStyle = "rgba(45,25,0,0.95)";
    ctx.strokeText(numero, x, y);
    ctx.restore();

    // --- 5) Dibuja el oro encima ---
    ctx.drawImage(goldLayer, 0, 0);

    // --- 6) Borde interior claro para efecto “3D” ---
    ctx.save();
    ctx.lineJoin = "round";
    ctx.font = `900 ${fontSize}px "Montserrat"`;
    ctx.lineWidth = Math.max(5, Math.floor(img.width * 0.007));
    ctx.strokeStyle = "rgba(255,245,210,0.70)";
    ctx.strokeText(numero, x, y - Math.floor(fontSize * 0.02));
    ctx.restore();

    // Cache control (mientras pruebas)
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(canvas.toBuffer("image/png"));
  } catch (e) {
    console.error(e);
    res.status(500).send("Error generando imagen");
  }
};
