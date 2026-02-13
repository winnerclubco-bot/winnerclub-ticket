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
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Tamaño grande (ajústalo si quieres)
    const fontSize = Math.floor(img.width * 0.20);
    ctx.font = `bold ${fontSize}px "Montserrat"`;

    // Posición (un poquito más abajo del centro)
    const x = img.width / 2;
    const y = img.height / 2 + Math.floor(img.height * 0.10);

    // --- ESTILO DORADO COMO LA IMAGEN (bordes + color) ---

    ctx.lineJoin = "round";
    ctx.miterLimit = 2;

    // 1) Borde exterior oscuro (tipo dorado profundo)
    const outerLW = Math.max(16, Math.floor(img.width * 0.020));
    ctx.lineWidth = outerLW;
    ctx.strokeStyle = "#7a4a00"; // dorado oscuro/marrón
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = Math.max(6, Math.floor(img.width * 0.010));
    ctx.shadowOffsetX = Math.floor(img.width * 0.002);
    ctx.shadowOffsetY = Math.floor(img.width * 0.002);
    ctx.strokeText(numero, x, y);

    // 2) Borde interior brillante (casi blanco/amarillo)
    ctx.shadowColor = "rgba(0,0,0,0)";
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(6, Math.floor(outerLW * 0.45));
    ctx.strokeStyle = "#fff2b0"; // brillo dorado claro
    ctx.strokeText(numero, x, y);

    // 3) Relleno con gradiente metálico dorado
    const metrics = ctx.measureText(numero);
    const textW = metrics.width;
    const textH = fontSize;

    const grad = ctx.createLinearGradient(
      x - textW / 2,
      y - textH / 2,
      x + textW / 2,
      y + textH / 2
    );

    // Paradas para look “oro” (luz -> medio -> sombra -> brillo)
    grad.addColorStop(0.00, "#fff6c9");
    grad.addColorStop(0.18, "#ffd86b");
    grad.addColorStop(0.42, "#ffb300");
    grad.addColorStop(0.62, "#d48700");
    grad.addColorStop(0.82, "#ffe07a");
    grad.addColorStop(1.00, "#fff4c2");

    // Glow suave como destello
    ctx.fillStyle = grad;
    ctx.shadowColor = "rgba(255, 215, 90, 0.55)";
    ctx.shadowBlur = Math.max(10, Math.floor(img.width * 0.016));
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillText(numero, x, y);

    // 4) “Bisel” sutil (highlight interno arriba / sombra interna abajo)
    //    (se logra con un stroke fino encima y otro debajo cambiando ligeramente el y)
    ctx.shadowColor = "rgba(0,0,0,0)";
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(2, Math.floor(img.width * 0.004));

    // highlight arriba
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.strokeText(numero, x, y - Math.floor(fontSize * 0.02));

    // sombra abajo
    ctx.strokeStyle = "rgba(120,60,0,0.35)";
    ctx.strokeText(numero, x, y + Math.floor(fontSize * 0.02));

    // --- FIN ESTILO ---

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store"); // para evitar cache mientras pruebas
    res.status(200).send(canvas.toBuffer("image/png"));
  } catch (e) {
    console.error(e);
    res.status(500).send("Error generando imagen");
  }
};
