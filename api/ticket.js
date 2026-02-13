const { createCanvas, loadImage } = require("canvas");

module.exports = async (req, res) => {
  try {
    // ✅ Parse robusto del query (sirve en cualquier runtime)
    const url = new URL(req.url, "http://localhost");
    const raw =
      url.searchParams.get("num") ||
      url.searchParams.get("numero") ||
      "";

    const clean = String(raw).replace(/\D/g, "").slice(0, 4);
    const numero = clean.padStart(4, "0");

    const baseImageUrl = process.env.BASE_DIAMOND_URL;
    if (!baseImageUrl) {
      res.statusCode = 500;
      res.end("Falta BASE_DIAMOND_URL");
      return;
    }

    const img = await loadImage(baseImageUrl);

    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    // Fondo
    ctx.drawImage(img, 0, 0);

    // ✅ (Opcional pero recomendado) tapar placeholder del PNG base con una placa
    const plateW = img.width * 0.55;
    const plateH = img.height * 0.18;
    const plateX = (img.width - plateW) / 2;
    const plateY = (img.height - plateH) / 2;

    // Placa oscura semi-transparente
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    roundRect(ctx, plateX, plateY, plateW, plateH, Math.min(40, plateH / 2));
    ctx.fill();

    // ✅ Texto grande centrado
    const fontSize = Math.floor(img.width * 0.18); // ajusta aquí si lo quieres más grande
    ctx.font = `900 ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Contorno negro
    ctx.lineWidth = Math.max(8, Math.floor(img.width * 0.01));
    ctx.strokeStyle = "#000000";
    ctx.strokeText(numero, img.width / 2, img.height / 2);

    // Relleno blanco
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(numero, img.width / 2, img.height / 2);

    // ✅ IMPORTANTE: durante pruebas, NO cache
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");

    // Debug útil (mira en Network/Headers)
    res.setHeader("X-Debug-Numero", numero);

    res.statusCode = 200;
    res.end(canvas.toBuffer("image/png"));
  } catch (e) {
    res.statusCode = 500;
    res.end("Error generando imagen");
  }
};

// Helper: rectángulo redondeado
function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
