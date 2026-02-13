const { createCanvas, loadImage } = require("canvas"); // Quitamos registerFont temporalmente
const path = require("path");

module.exports = async (req, res) => {
  try {
    const raw = String(req.query.num ?? req.query.numero ?? "")
        .replace(/\D/g, "")
        .slice(0, 4);

    const numero = raw.padStart(4, "0");

    const baseImageUrl = process.env.BASE_DIAMOND_URL;
    if (!baseImageUrl) {
      return res.status(400).send("ERROR: Falta configurar la variable BASE_DIAMOND_URL en tu servidor.");
    }

    // Cargamos la imagen
    const img = await loadImage(baseImageUrl);

    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const fontSize = Math.floor(img.width * 0.28);
    // Usamos 'sans-serif' genérico para evitar errores de fuente faltante por ahora
    ctx.font = `bold ${fontSize}px sans-serif`;

    const x = img.width / 2;
    const y = img.height * 0.52; 

    const fillGrad = ctx.createLinearGradient(0, y - fontSize/2, 0, y + fontSize/2);
    fillGrad.addColorStop(0.0, '#FFF5C2'); 
    fillGrad.addColorStop(0.3, '#F6D264'); 
    fillGrad.addColorStop(0.5, '#C68B25'); 
    fillGrad.addColorStop(0.7, '#F8D45A'); 
    fillGrad.addColorStop(1.0, '#9C6212'); 

    const strokeGrad = ctx.createLinearGradient(0, y - fontSize/2, 0, y + fontSize/2);
    strokeGrad.addColorStop(0.0, '#FFFFFF'); 
    strokeGrad.addColorStop(0.5, '#DA9B2A'); 
    strokeGrad.addColorStop(1.0, '#FFE375'); 

    // Capas
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 12;
    ctx.lineWidth = Math.floor(img.width * 0.04);
    ctx.strokeStyle = '#2A1100'; 
    ctx.strokeText(numero, x, y);

    ctx.shadowColor = 'transparent';

    ctx.lineWidth = Math.floor(img.width * 0.025);
    ctx.strokeStyle = strokeGrad;
    ctx.strokeText(numero, x, y);

    ctx.lineWidth = Math.floor(img.width * 0.008);
    ctx.strokeStyle = '#5A3200';
    ctx.strokeText(numero, x, y);

    ctx.fillStyle = fillGrad;
    ctx.fillText(numero, x, y);

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store"); 
    res.status(200).send(canvas.toBuffer("image/png"));

  } catch (e) {
    console.error("Error detallado:", e);
    // Esto imprimirá el error real en tu navegador/Postman para saber qué falló
    res.status(500).send(`Error generando imagen: ${e.message}`);
  }
};
