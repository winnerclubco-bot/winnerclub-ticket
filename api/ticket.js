const { createCanvas, loadImage } = require("canvas");

module.exports = async (req, res) => {
  try {
    // Acepta num o numero
    const raw = String(req.query.num ?? req.query.numero ?? "");
    const num = raw.replace(/\D/g, "").slice(0, 4);
    const numero = num.padStart(4, "0");

    const baseImageUrl = process.env.BASE_DIAMOND_URL;
    if (!baseImageUrl) {
      res.status(500).send("Falta BASE_DIAMOND_URL");
      return;
    }

    const img = await loadImage(baseImageUrl);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    // Fondo
    ctx.drawImage(img, 0, 0);

    // ===== PLACA VIP (para que el número SIEMPRE se lea) =====
    const cx = img.width / 2;
    const cy = img.height / 2;

    const plateW = Math.floor(img.width * 0.42);
    const plateH = Math.floor(img.height * 0.22);
    const plateX = Math.floor(cx - plateW / 2);
    const plateY = Math.floor(cy - plateH / 2);

    // helper: rect redondeado
    const rrect = (x, y, w, h, r) => {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    };

    // Sombra de la placa
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = Math.floor(img.width * 0.03);
    ctx.shadowOffsetY = Math.floor(img.height * 0.01);

    // Placa oscura translúcida
    rrect(plateX, plateY, plateW, plateH, Math.floor(plateH * 0.35));
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fill();
    ctx.restore();

    // Borde dorado suave
    ctx.save();
    rrect(plateX, plateY, plateW, plateH, Math.floor(plateH * 0.35));
    ctx.lineWidth = Math.max(6, Math.floor(img.width * 0.006));
    ctx.strokeStyle = "rgba(255, 215, 0, 0.75)";
    ctx.stroke();
    ctx.restore();

    // ===== NÚMERO GRANDE =====
    const fontPx = Math.floor(img.width * 0.22); // GRANDE
    ctx.font = `900 ${fontPx}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Brillo/sombra dorada detrás
    ctx.save();
    ctx.shadowColor = "rgba(255, 200, 0, 0.75)";
    ctx.shadowBlur = Math.floor(img.width * 0.02);
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillText(numero, cx, cy);
    ctx.restore();

    // Contorno negro fuerte para contraste
    ctx.lineWidth = Math.max(10, Math.floor(img.width * 0.012));
    ctx.strokeStyle = "#000000";
    ctx.strokeText(numero, cx, cy);

    // Relleno blanco encima (nítido)
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(numero, cx, cy);

    // Headers (IMPORTANTE: sin cache mientras pruebas)
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.status(200).send(canvas.toBuffer("image/png"));
  } catch (e) {
    res.status(500).send("Error generando imagen");
  }
};
