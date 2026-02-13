const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");

module.exports = async (req, res) => {
  try {
    const raw = String(req.query.num ?? req.query.numero ?? "")
      .replace(/\D/g, "")
      .slice(0, 4);

    const numero = raw.padStart(4, "0");

    const baseImageUrl = process.env.BASE_DIAMOND_URL;
    if (!baseImageUrl) {
      res.status(500).send("Falta BASE_DIAMOND_URL");
      return;
    }

    const fontPath = path.join(process.cwd(), "fonts", "Montserrat-Bold.ttf");
    registerFont(fontPath, { family: "Montserrat", weight: "bold" });

    const img = await loadImage(baseImageUrl);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    // Fondo
    ctx.drawImage(img, 0, 0);

    // Configuración de texto
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // === COMO IMAGEN 1: GRANDE Y CENTRADO ===
    const fontSize = Math.floor(img.width * 0.28);
    ctx.font = `bold ${fontSize}px "Montserrat"`;

    const x = img.width / 2;
    const y = img.height / 2 + Math.floor(img.height * 0.02);

    // === BORDES NÍTIDOS + COLORES COMO IMAGEN 2 ===
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;

    // Sombra suave (profundidad sin difuminar bordes)
    ctx.shadowColor = "rgba(0,0,0,0.28)";
    ctx.shadowBlur = Math.max(2, Math.floor(img.width * 0.004));
    ctx.shadowOffsetX = Math.floor(img.width * 0.002);
    ctx.shadowOffsetY = Math.floor(img.width * 0.003);

    // 1) Borde exterior oscuro (definición)
    ctx.lineWidth = Math.max(10, Math.floor(fontSize * 0.14));
    ctx.strokeStyle = "#5b3a06"; // marrón dorado oscuro (menos “negro”)
    ctx.strokeText(numero, x, y);

    // Quitar sombra para que los bordes internos queden limpios
    ctx.shadowColor = "rgba(0,0,0,0)";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 2) Borde medio dorado (anillo principal como imagen 2)
    ctx.lineWidth = Math.max(6, Math.floor(fontSize * 0.09));
    ctx.strokeStyle = "#d2aa2a"; // dorado claro
    ctx.strokeText(numero, x, y);

    // 3) Borde interno claro (brillo)
    ctx.lineWidth = Math.max(3, Math.floor(fontSize * 0.045));
    ctx.strokeStyle = "#fff1bf"; // crema/amarillo muy claro
    ctx.strokeText(numero, x, y);

    // 4) Relleno (oro claro tipo crema como imagen 2)
    const gradient = ctx.createLinearGradient(
      0,
      y - fontSize / 2,
      0,
      y + fontSize / 2
    );
    gradient.addColorStop(0.00, "#fff6cf"); // brillo arriba
    gradient.addColorStop(0.25, "#ffe08a"); // oro claro
    gradient.addColorStop(0.55, "#f4c64d"); // oro medio suave
    gradient.addColorStop(1.00, "#d19a20"); // base (sin oscurecer demasiado)

    ctx.fillStyle = gradient;
    ctx.fillText(numero, x, y);

    // 5) Bisel sutil (brillo arriba / sombra abajo) SIN blur
    ctx.lineWidth = Math.max(2, Math.floor(fontSize * 0.02));
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.strokeText(numero, x, y - Math.floor(fontSize * 0.02));

    ctx.strokeStyle = "rgba(90,50,5,0.25)";
    ctx.strokeText(numero, x, y + Math.floor(fontSize * 0.02));

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(canvas.toBuffer("image/png"));
  } catch (e) {
    console.error(e);
    res.status(500).send("Error generando imagen");
  }
};
