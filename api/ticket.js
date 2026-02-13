const { createCanvas, loadImage } = require("canvas");

module.exports = async (req, res) => {
  try {
    const num = String(req.query.num || "").replace(/\D/g, "").slice(0, 4);
    const numero = num.padStart(4, "0");

    const baseImageUrl = process.env.BASE_DIAMOND_URL;
    if (!baseImageUrl) return res.status(500).send("Falta BASE_DIAMOND_URL");

    const img = await loadImage(baseImageUrl);

    // ✅ Forzamos un tamaño grande y consistente
    const W = 1400;
    const H = 900;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // Fondo negro tipo "premium"
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);

    // Dibujar diamante centrado y grande (escalado)
    // Ajusta el porcentaje si quieres más grande/pequeño
    const diamondScale = 0.88;
    const dw = W * diamondScale;
    const dh = (img.height / img.width) * dw;

    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;

    ctx.drawImage(img, dx, dy, dw, dh);

    // ✅ Número grande, centrado
    const fontSize = Math.floor(W * 0.18); // sube/baja: 0.18
    ctx.font = `900 ${fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Contorno negro + relleno dorado/blanco (se ve sobre el diamante)
    ctx.lineWidth = Math.max(12, Math.floor(fontSize * 0.12));
    ctx.strokeStyle = "#000000";
    ctx.strokeText(numero, W / 2, H / 2);

    ctx.fillStyle = "#FFD700"; // dorado
    ctx.fillText(numero, W / 2, H / 2);

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store"); // para ver cambios inmediato
    return res.status(200).send(canvas.toBuffer("image/png"));
  } catch (e) {
    return res.status(500).send("Error generando imagen");
  }
};
