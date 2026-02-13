const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");

module.exports = async (req, res) => {
  try {
    const num = String(req.query.num || "").replace(/\D/g, "").slice(0, 4);
    const numero = num.padStart(4, "0");

    const baseImageUrl = process.env.BASE_DIAMOND_URL;

    if (!baseImageUrl) {
      res.status(500).send("Falta BASE_DIAMOND_URL");
      return;
    }

    // ✅ REGISTRAR FUENTE LOCAL (IMPORTANTE)
    registerFont(path.join(process.cwd(), "fonts", "Montserrat-Bold.ttf"), {
      family: "Montserrat",
    });

    const img = await loadImage(baseImageUrl);

    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0);

    // ✅ USAR LA FUENTE REGISTRADA
    ctx.font = `bold ${Math.floor(img.width * 0.28)}px Montserrat`;
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
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(200).send(canvas.toBuffer("image/png"));
  } catch (e) {
    console.error(e);
    res.status(500).send("Error generando imagen");
  }
};
