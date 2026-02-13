const { createCanvas, loadImage } = require("canvas");

module.exports = async (req, res) => {
  try {
    // ✅ Lee query params de forma robusta (funciona aunque req.query venga vacío)
    const url = new URL(req.url, "https://dummy.local");
    const raw =
      url.searchParams.get("num") ||
      url.searchParams.get("numero") ||
      (req.query && (req.query.num || req.query.numero)) ||
      "";

    const num = String(raw).replace(/\D/g, "").slice(0, 4);
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

    // ✅ (Opcional) un “panel” para que el número se lea MUY bien
    const panelW = Math.floor(img.width * 0.55);
    const panelH = Math.floor(img.height * 0.22);
    const panelX = Math.floor((img.width - panelW) / 2);
    const panelY = Math.floor((img.height - panelH) / 2);

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    const r = Math.floor(panelH * 0.25);
    ctx.moveTo(panelX + r, panelY);
    ctx.arcTo(panelX + panelW, panelY, panelX + panelW, panelY + panelH, r);
    ctx.arcTo(panelX + panelW, panelY + panelH, panelX, panelY + panelH, r);
    ctx.arcTo(panelX, panelY + panelH, panelX, panelY, r);
    ctx.arcTo(panelX, panelY, panelX + panelW, panelY, r);
    ctx.closePath();
    ctx.fill();

    // Texto grande centrado
    const fontSize = Math.floor(img.width * 0.20);
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Contorno negro
    ctx.lineWidth = Math.max(8, Math.floor(img.width * 0.010));
    ctx.strokeStyle = "#000000";
    ctx.strokeText(numero, img.width / 2, img.height / 2);

    // Relleno blanco
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(numero, img.width / 2, img.height / 2);

    // ✅ Mientras pruebas: NO cache (para que siempre cambie al instante)
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(canvas.toBuffer("image/png"));
  } catch (e) {
    res.status(500).send("Error generando imagen");
  }
};
