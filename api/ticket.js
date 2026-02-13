const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");

// Función auxiliar para dibujar un destello de luz (lens flare)
function dibujarDestello(ctx, x, y, radio) {
  // Brillo central difuminado
  const gradiente = ctx.createRadialGradient(x, y, 0, x, y, radio);
  gradiente.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradiente.addColorStop(0.2, "rgba(255, 235, 120, 0.8)");
  gradiente.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradiente;
  ctx.beginPath();
  ctx.arc(x, y, radio, 0, Math.PI * 2);
  ctx.fill();

  // Estrella de 4 puntas
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  ctx.moveTo(x, y - radio);
  ctx.lineTo(x + radio * 0.08, y - radio * 0.15);
  ctx.lineTo(x + radio, y);
  ctx.lineTo(x + radio * 0.08, y + radio * 0.15);
  ctx.lineTo(x, y + radio);
  ctx.lineTo(x - radio * 0.08, y + radio * 0.15);
  ctx.lineTo(x - radio, y);
  ctx.lineTo(x - radio * 0.08, y - radio * 0.15);
  ctx.closePath();
  ctx.fill();
}

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

    // 2. Configuración de texto
    // Centrado horizontal garantizado
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // 15% más grande (antes 0.31)
    const fontSize = Math.floor(img.width * 0.31 * 1.15);
    ctx.font = `bold ${fontSize}px "Montserrat"`;

    // Posición X al centro del canvas
    const x = img.width / 2;

    // Mantengo tu Y igual
    const y = img.height * 0.36;

    // --- EFECTO DE ESTILO DORADO ---

    ctx.lineJoin = "round";

    // Borde exterior grueso (Sombra/Relieve oscuro)
    ctx.lineWidth = fontSize * 0.15;
    ctx.strokeStyle = "#432a02";
    ctx.strokeText(numero, x, y);

    // Borde medio (Brillo dorado exterior)
    ctx.lineWidth = fontSize * 0.10;
    ctx.strokeStyle = "#dbb101";
    ctx.strokeText(numero, x, y);

    // Borde interno fino (Luz blanca/dorada clara)
    ctx.lineWidth = fontSize * 0.04;
    ctx.strokeStyle = "#fff2a8";
    ctx.strokeText(numero, x, y);

    // Relleno con Degradado Dorado (ajustado para top baseline)
    const gradient = ctx.createLinearGradient(0, y, 0, y + fontSize * 0.8);
    gradient.addColorStop(0, "#fff5a5");
    gradient.addColorStop(0.2, "#ffcc00");
    gradient.addColorStop(0.5, "#d4a017");
    gradient.addColorStop(1, "#8a6d3b");

    ctx.fillStyle = gradient;

    // Añadir un brillo extra (Efecto "Glow") al relleno
    ctx.shadowColor = "rgba(255, 230, 0, 0.4)";
    ctx.shadowBlur = 10;
    ctx.fillText(numero, x, y);

    // Resetear sombra para los destellos
    ctx.shadowBlur = 0;

    // --- DESTELLOS DE LUZ (LENS FLARES) ---
    const textWidth = ctx.measureText(numero).width;
    const textHeight = fontSize * 0.75;

    // Destello 1: Esquina superior izquierda
    dibujarDestello(
      ctx,
      x - textWidth / 2 + fontSize * 0.05,
      y + fontSize * 0.05,
      fontSize * 0.25
    );

    // Destello 2: Esquina inferior derecha
    dibujarDestello(
      ctx,
      x + textWidth / 2 - fontSize * 0.05,
      y + textHeight - fontSize * 0.05,
      fontSize * 0.3
    );

    // Destello 3: Uno pequeño extra en el medio/arriba para más magia
    dibujarDestello(ctx, x, y + fontSize * 0.1, fontSize * 0.15);

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(canvas.toBuffer("image/png"));
  } catch (e) {
    console.error(e);
    res.status(500).send("Error generando imagen");
  }
};
