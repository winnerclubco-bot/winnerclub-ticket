const { createCanvas, loadImage } = require("canvas");

module.exports = async (req, res) => {
  try {
    // ✅ Leer query SIEMPRE (funciona aunque req.query no exista)
    const url = new URL(req.url, "http://localhost");
    const raw = url.searchParams.get("num") || "";

    const num = String(raw).replace(/\D/g, "").slice(0, 4);
    const numero = num.padStart(4, "0");

    const baseImageUrl = process.env.BASE_DIAMOND_URL;
    if (!baseImageUrl) {
      return res.status(500).send("Falta BASE_DIAMOND_URL");
    }

    const img = await loadImage(baseImageUrl);

    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    // Fondo
    ctx.drawImage(img, 0, 0);

    // ====== VIP STYLE (grande, contrastado, dorado) ======
    const cx = img.width / 2;
    const cy = img.height / 2;

    // Tamaño grande relativo al lienzo
    const fontSize = Math.floor(Math.min(img.width, img.height) * 0.22);
    ctx.font = `900 ${fontSize}px Arial Black, Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Medidas del texto
    const metrics = ctx.measureText(numero);
    const textW = metrics.width;
    const padX = Math.floor(fontSize * 0.35);
    const padY = Math.floor(fontSize * 0.22);

    // Caja oscura semitransparente detrás (para que siempre se vea)
    const boxW = textW + padX * 2;
    const boxH = fontSize + padY * 2;
    const x = Math.floor(cx - boxW / 2);
    const y = Math.floor(cy - boxH / 2);
    const r = Math.floor(boxH * 0.25);

    // Rounded rect
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + boxW - r, y);
    ctx.quadraticCurveTo(x + boxW, y, x + boxW, y + r);
    ctx.lineTo(x + boxW, y + boxH - r);
    ctx.quadraticCurveTo(x + boxW, y + boxH, x + boxW - r, y + boxH);
    ctx.lineTo(x + r, y + boxH);
    ctx.quadraticCurveTo(x, y + boxH, x, y + boxH - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fill();
    ctx.restore();

    // Contorno negro grueso
    ctx.lineWidth = Math.max(10, Math.floor(fontSize * 0.12));
    ctx.strokeStyle = "#000000";
    ctx.strokeText(numero, cx, cy);

    // Relleno dorado (degradado)
    const grad = ctx.createLinearGradient(cx - boxW / 2, cy - boxH / 2, cx + boxW / 2, cy + boxH / 2);
    grad.addColorStop(0, "#FFF2B2");
    grad.addColorStop(0.45, "#FFD15A");
    grad.addColorStop(1, "#B87900");

    // Glow suave
    ctx.shadowColor = "rgba(255, 215, 90, 0.75)";
    ctx.shadowBlur = Math.floor(fontSize * 0.18);

    ctx.fillStyle = grad;
    ctx.fillText(numero, cx, cy);

    // Headers
    res.setHeader("Content-Type", "image/png");
    // 👇 para que no te muestre versiones viejas mientras pruebas
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(canvas.toBuffer("image/png"));
  } catch (e) {
    return res.status(500).send("Error generando imagen");
  }
};
