const { createCanvas, loadImage } = require("canvas");

module.exports = async (req, res) => {
  try {
    const num = String(req.query.num || "").replace(/\D/g, "").slice(0, 4);
    const numero = num.padStart(4, "0");

    // URL pública del diamante
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

    // ====== TEXTO VIP ======
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Tamaño un poco más grande
    ctx.font = `bold ${Math.floor(img.width * 0.32)}px Arial`;

    // Sombra profunda
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = 35;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 12;

    // Contorno oscuro grueso
    ctx.lineWidth = Math.max(16, Math.floor(img.width * 0.022));
    ctx.strokeStyle = "#111111";
    ctx.strokeText(numero, img.width / 2, img.height / 2);

    // Texto dorado
    ctx.fillStyle = "#FFD700";
    ctx.fillText(numero, img.width / 2, img.height / 2);

    // Quitar sombra para no afectar nada más
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    // =======================

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(200).send(canvas.toBuffer("image/png"));
  } catch (e) {
    res.status(500).send("Error generando imagen");
  }
};
