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

    // 3) (Clave) Forzar fontconfig a usar fuentes del proyecto
    //    Crea carpeta fonts/ y mete Montserrat-Bold.ttf ahí.
    //    Esto ayuda mucho en entornos serverless como Vercel.
    const fontPath = path.join(process.cwd(), "fonts", "Montserrat-Bold.ttf");
    registerFont(fontPath, { family: "Montserrat", weight: "bold" });

    const img = await loadImage(baseImageUrl);

    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    // Fondo
    ctx.drawImage(img, 0, 0);

    // Mejor render
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Tamaño grande (ajústalo si quieres)
    const fontSize = Math.floor(img.width * 0.20);
    ctx.font = `bold ${fontSize}px "Montserrat"`;

    // Posición (un poquito más abajo del centro)
    const x = img.width / 2;
    const y = img.height / 2 + Math.floor(img.height * 0.10);

    // Contorno negro
    ctx.lineWidth = Math.max(8, Math.floor(img.width * 0.012));
    ctx.strokeStyle = "#000000";
    ctx.strokeText(numero, x, y);

    // Relleno blanco
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(numero, x, y);

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store"); // para evitar cache mientras pruebas
    res.status(200).send(canvas.toBuffer("image/png"));
  } catch (e) {
    console.error(e);
    res.status(500).send("Error generando imagen");
  }
};

