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

    // 3) Fuente
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

    // =========================
    // AJUSTES CLAVE (como tu referencia)
    // - Tamaño más “ancho” y dominante
    // - Posición más abajo
    // - Colores dorados + brillo
    // =========================
    const x = img.width / 2;
    const y = img.height * 0.66; // más abajo que el centro (similar a la imagen)

    // Tamaño: en tu ejemplo el número ocupa casi todo el ancho del diamante
    const fontSize = Math.floor(img.width * 0.30);
    ctx.font = `bold ${fontSize}px "Montserrat"`;

    // --- Gradiente dorado principal (de arriba a abajo)
    const g = ctx.createLinearGradient(0, y - fontSize * 0.75, 0, y + fontSize * 0.75);
    g.addColorStop(0.0, "#FFF6B0");  // highlight superior
    g.addColorStop(0.22, "#FFD24A"); // oro claro
    g.addColorStop(0.55, "#F0A800"); // oro medio
    g.addColorStop(0.80, "#C77A00"); // oro oscuro
    g.addColorStop(1.0, "#FFE48A");  // rebote de luz abajo

    // --- Contorno oscuro externo (como el borde marcado del ejemplo)
    ctx.save();
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;

    const outerStroke = Math.max(10, Math.floor(img.width * 0.018));
    ctx.lineWidth = outerStroke;
    ctx.strokeStyle = "#6B3A00"; // marrón oscuro dorado (no negro puro)
    ctx.strokeText(numero, x, y);
    ctx.restore();

    // --- Brillo externo (glow) dorado
    ctx.save();
    ctx.shadowColor = "rgba(255, 200, 40, 0.75)";
    ctx.shadowBlur = Math.floor(img.width * 0.03);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Un stroke fino brillante para dar “neón” dorado
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(4, Math.floor(img.width * 0.008));
    ctx.strokeStyle = "#FFD86A";
    ctx.strokeText(numero, x, y);
    ctx.restore();

    // --- Relleno dorado (principal)
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillText(numero, x, y);
    ctx.restore();

    // --- Contorno interno claro (bevel / borde iluminado)
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(3, Math.floor(img.width * 0.006));
    ctx.strokeStyle = "#FFF2B8";
    ctx.strokeText(numero, x, y);
    ctx.restore();

    // --- “Brillo” superior (highlight) dentro del número
    //     Simula el efecto 3D del ejemplo con un overlay suave
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const hg = ctx.createLinearGradient(0, y - fontSize * 0.65, 0, y + fontSize * 0.10);
    hg.addColorStop(0.0, "rgba(255,255,255,0.85)");
    hg.addColorStop(0.35, "rgba(255,255,255,0.25)");
    hg.addColorStop(1.0, "rgba(255,255,255,0.00)");
    ctx.fillStyle = hg;

    // Clip al texto y pinta el highlight dentro
    ctx.beginPath();
    ctx.rect(0, 0, img.width, img.height);
    ctx.clip(); // (canvas) clip global, luego usamos texto como máscara con destination-in

    // Pintamos highlight full, y luego lo recortamos al texto
    ctx.fillRect(0, 0, img.width, img.height);

    ctx.globalCompositeOperation = "destination-in";
    ctx.font = `bold ${fontSize}px "Montserrat"`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(numero, x, y);
    ctx.restore();

    // --- “Sombra” interna inferior (da profundidad)
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    const sg = ctx.createLinearGradient(0, y, 0, y + fontSize * 0.75);
    sg.addColorStop(0.0, "rgba(0,0,0,0.00)");
    sg.addColorStop(1.0, "rgba(80,40,0,0.35)");
    ctx.fillStyle = sg;

    // recorta a texto
    ctx.globalCompositeOperation = "source-over";
    ctx.fillRect(0, 0, img.width, img.height);
    ctx.globalCompositeOperation = "destination-in";
    ctx.font = `bold ${fontSize}px "Montserrat"`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(numero, x, y);
    ctx.restore();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(canvas.toBuffer("image/png"));
  } catch (e) {
    console.error(e);
    res.status(500).send("Error generando imagen");
  }
};
