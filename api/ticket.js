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

    // 1. Dibujar el diamante de fondo
    ctx.drawImage(img, 0, 0);

    // Configuración de texto
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Tamaño: En la imagen los números ocupan casi el 50-60% del ancho
    const fontSize = Math.floor(img.width * 0.36); 
    ctx.font = `bold ${fontSize}px "Montserrat"`;

    // Posición: Justo en el centro vertical y horizontal
    const x = img.width / 2;
    const y = img.height / 2 + Math.floor(img.height * 0.02); // Ajuste leve para equilibrio visual

    // --- EFECTO DE ESTILO DORADO ---

    // 2. Borde exterior grueso (Sombra/Relieve oscuro)
    ctx.lineJoin = "round";
    ctx.lineWidth = fontSize * 0.15; // Borde proporcional al tamaño
    ctx.strokeStyle = "#432a02"; // Marrón muy oscuro para el relieve
    ctx.strokeText(numero, x, y);

    // 3. Borde medio (Brillo dorado exterior)
    ctx.lineWidth = fontSize * 0.10;
    ctx.strokeStyle = "#dbb101"; // Dorado base
    ctx.strokeText(numero, x, y);

    // 4. Borde interno fino (Luz blanca/dorada clara)
    ctx.lineWidth = fontSize * 0.04;
    ctx.strokeStyle = "#fff2a8"; 
    ctx.strokeText(numero, x, y);

    // 5. Relleno con Degradado Dorado (de arriba a abajo)
    const gradient = ctx.createLinearGradient(0, y - fontSize / 2, 0, y + fontSize / 2);
    gradient.addColorStop(0, "#fff5a5"); // Brillo superior
    gradient.addColorStop(0.2, "#ffcc00"); // Dorado claro
    gradient.addColorStop(0.5, "#d4a017"); // Dorado medio
    gradient.addColorStop(1, "#8a6d3b");   // Dorado oscuro/sombra inferior

    ctx.fillStyle = gradient;
    ctx.fillText(numero, x, y);

    // 6. Opcional: Añadir un brillo extra (Efecto "Glow")
    ctx.shadowColor = "rgba(255, 230, 0, 0.5)";
    ctx.shadowBlur = 15;
    ctx.fillText(numero, x, y);

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(canvas.toBuffer("image/png"));
  } catch (e) {
    console.error(e);
    res.status(500).send("Error generando imagen");
  }
};


