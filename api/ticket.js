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

    // 3) Fuente: Te recomiendo cambiar Montserrat por una fuente Serif gruesa
    // que coincida con la imagen de referencia (ej. "Cinzel-Bold.ttf" o "Merriweather-Black.ttf")
    const fontPath = path.join(process.cwd(), "fonts", "TuFuenteSerif-Bold.ttf");
    registerFont(fontPath, { family: "GoldFont", weight: "bold" });

    const img = await loadImage(baseImageUrl);

    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    // Dibujar Fondo
    ctx.drawImage(img, 0, 0);

    // Ajustes de texto
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Tamaño: En la imagen de referencia, los números ocupan casi el ancho del diamante.
    // Aumentamos el tamaño a un 28% o 30% del ancho (antes 20%).
    const fontSize = Math.floor(img.width * 0.28);
    ctx.font = `bold ${fontSize}px "GoldFont"`;

    // Posición: Ligeramente por debajo del centro absoluto para encajar en las facetas del diamante.
    const x = img.width / 2;
    const y = img.height * 0.52; 

    // --- CREACIÓN DE DEGRADADOS PARA EL EFECTO ORO ---
    
    // Degradado para el relleno interior (Fill)
    const fillGrad = ctx.createLinearGradient(0, y - fontSize/2, 0, y + fontSize/2);
    fillGrad.addColorStop(0.0, '#FFF5C2'); // Luz superior
    fillGrad.addColorStop(0.3, '#F6D264'); // Oro claro
    fillGrad.addColorStop(0.5, '#C68B25'); // Reflejo oscuro central (efecto metálico)
    fillGrad.addColorStop(0.7, '#F8D45A'); // Oro medio
    fillGrad.addColorStop(1.0, '#9C6212'); // Sombra inferior

    // Degradado para el borde dorado (Stroke)
    const strokeGrad = ctx.createLinearGradient(0, y - fontSize/2, 0, y + fontSize/2);
    strokeGrad.addColorStop(0.0, '#FFFFFF'); // Brillo máximo
    strokeGrad.addColorStop(0.5, '#DA9B2A'); // Oro fuerte
    strokeGrad.addColorStop(1.0, '#FFE375'); // Reflejo inferior

    // --- DIBUJADO EN CAPAS (De atrás hacia adelante para efecto 3D) ---

    // CAPA 1: Sombra profunda y contorno exterior muy grueso (marrón muy oscuro)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 12; // Sombra proyectada hacia abajo
    ctx.lineWidth = Math.floor(img.width * 0.04);
    ctx.strokeStyle = '#2A1100'; 
    ctx.strokeText(numero, x, y);

    // Desactivamos la sombra para las siguientes capas para no emborronar el interior
    ctx.shadowColor = 'transparent';

    // CAPA 2: Borde dorado grueso (el bisel brillante)
    ctx.lineWidth = Math.floor(img.width * 0.025);
    ctx.strokeStyle = strokeGrad;
    ctx.strokeText(numero, x, y);

    // CAPA 3: Línea interior oscura (separa el borde del relleno, dando profundidad)
    ctx.lineWidth = Math.floor(img.width * 0.008);
    ctx.strokeStyle = '#5A3200';
    ctx.strokeText(numero, x, y);

    // CAPA 4: El relleno texturizado final
    ctx.fillStyle = fillGrad;
    ctx.fillText(numero, x, y);

    // Respuesta de la imagen
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store"); 
    res.status(200).send(canvas.toBuffer("image/png"));
  } catch (e) {
    console.error(e);
    res.status(500).send("Error generando imagen");
  }
};
