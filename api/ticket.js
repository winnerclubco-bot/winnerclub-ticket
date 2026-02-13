const { createCanvas, loadImage, registerFont } = require("canvas");

module.exports = async (req, res) => {
  try {
    const num = String(req.query.num || "").replace(/\D/g, "").slice(0, 4);
    const numero = num.padStart(4, "0");

    // URL pública del diamante (la pones en el paso 4)
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

    // Texto grande centrado
    ctx.font = `bold ${Math.floor(img.width * 0.28)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Contorno negro
    ctx.lineWidth = Math.max(10, Math.floor(img.width * 0.015));
    ctx.strokeStyle = "#000000";
    ctx.strokeText(numero, img.width / 2, img.height / 2);

    // Relleno blanco
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(numero, img.width / 2, img.height / 2);

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=300"); // 5 min cache
    res.status(200).send(canvas.toBuffer("image/png"));
  } catch (e) {
    res.status(500).send("Error generando imagen");
  }
};
