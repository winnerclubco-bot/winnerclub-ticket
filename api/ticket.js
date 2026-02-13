const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");

module.exports = async (req, res) => {
  try {
    // 1) Lee num o numero
    const raw =
      String(req.query.num ?? req.query.numero ?? "")
        .replace(/\D/g, "")
        .slice(0, 4);

    const numero = raw.padStart(4, "0");

    // 2) URL del fondo (diamante)
    const baseImageUrl = process.env.BASE_DIAMOND_URL;
    if (!baseImageUrl) {
      res.status(500).send("Falta BASE_DIAMOND_URL");
      return;
    }

    // 3) Fuente
    const fontPath = path.join(process.cwd(), "fonts", "Montserrat-Bold.ttf");
    registerFont(fontPath, { family: "Montserrat", weight: "bold" });

    const img = await loadImage(baseImageUrl);

    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    // Fondo: SIEMPRE primero
    ctx.clearRect(0, 0, img.width, img.height);
    ctx.drawImage(img, 0, 0, img.width, img.height);

    // Render texto
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // ====== AJUSTES PRINCIPALES ======
    // En tu referencia el número va grande y en la parte baja del diamante
    const FONT_FACTOR = 0.22; // prueba 0.20 - 0.26
    const Y_FACTOR = 0.62;    // prueba 0.60 - 0.68

    const fontSize = Math.floor(img.width * FONT_FACTOR);
    ctx.font = `900 ${fontSize}px "Montserrat"`;

    const x = img.width / 2;
    const y = img.height * Y_FACTOR;

    // ====== ESTILO "ORO" ======
    // Gradiente vertical (arriba más claro, abajo más oscuro)
    const gold = ctx.createLinearGradient(0, y - fontSize * 0.9, 0, y + fontSize * 0.9);
    gold.addColorStop(0.00, "#FFF7C2");
    gold.addColorStop(0.20, "#FFD45C");
    gold.addColorStop(0.52, "#F2AE00");
    gold.addColorStop(0.80, "#B96A00");
    gold.addColorStop(1.00, "#FFE08A");

    // (1) Borde oscuro exterior (da el look “3D”)
    ctx.save();
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.lineWidth = Math.max(10, Math.floor(img.width * 0.014));
    ctx.strokeStyle = "#6A3A00"; // marrón-dorado (mejor que negro puro)
    ctx.strokeText(numero, x, y);
    ctx.restore();

    // (2) Glow dorado (brillo afuera)
    ctx.save();
    ctx.shadowColor = "rgba(255, 195, 20, 0.9)";
    ctx.shadowBlur = Math.floor(img.width * 0.02);
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(5, Math.floor(img.width * 0.007));
    ctx.strokeStyle = "#FFD86A";
    ctx.strokeText(numero, x, y);
    ctx.restore();

    // (3) Relleno dorado
    ctx.save();
    ctx.fillStyle = gold;
    ctx.fillText(numero, x, y);
    ctx.restore();

    // (4) Borde interno claro (bevel / borde brillante)
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(3, Math.floor(img.width * 0.0045));
    ctx.strokeStyle = "rgba(255, 245, 200, 0.95)";
    ctx.strokeText(numero, x, y);
    ctx.restore();

    // (5) Brillo superior sutil dentro (SIN recortar el fondo)
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.globalCompositeOperation = "screen";
    const topGlow = ctx.createLinearGradient(0, y - fontSize * 0.9, 0, y);
    topGlow.addColorStop(0.0, "rgba(255,255,255,0.85)");
    topGlow.addColorStop(1.0, "rgba(255,255,255,0.0)");
    ctx.fillStyle = topGlow;
    // “copia” el texto un pelín hacia arriba para simular highlight
    ctx.fillText(numero, x, y - Math.floor(fontSize * 0.06));
    ctx.restore();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(canvas.toBuffer("image/png"));
  } catch (e) {
    console.error(e);
    res.status(500).send("Error generando imagen");
  }
};
