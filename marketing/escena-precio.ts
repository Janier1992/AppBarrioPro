// ======================================================
// Archivo: marketing/escena-precio.ts
// Responsabilidad: Generar la escena final del video con el plan y el precio (tomados de src/lib/pricing.ts,
//   la misma fuente que usan /planes y el manual) y añadirla a las escenas grabadas.
// Uso: NODE_PATH=$(npm root -g) npx tsx marketing/escena-precio.ts marketing/escenas [duracion_s]
// Resultado: <escenas>/16-planes.mp4 (1080x1920, 30 fps) y su entrada en escenas.json.
// La franja superior (104 px CSS) queda libre: el compositor dibuja ahí los subtítulos.
// ======================================================
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { PLAN, priceLabel, trialLabel, whatsappDisplay } from "../src/lib/pricing";

const { chromium } = createRequire(import.meta.url)("playwright");
const escenasDir = path.resolve(process.argv[2] || "marketing/escenas");
const duration = Number(process.argv[3] || 7);
const BAND = 104;

const cta = `WhatsApp ${whatsappDisplay()}`;
const highlights = [
  "Ventas, inventario y fiados en un solo lugar",
  "Asistente con inteligencia artificial",
  "Celular y computador, aun sin señal",
];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box} body{margin:0;width:360px;height:640px;background:#2F6B4F;font-family:'Inter','Segoe UI',Arial,sans-serif;color:#212121;overflow:hidden}
  .wrap{padding:${BAND + 8}px 22px 20px;height:100%;display:flex;flex-direction:column;gap:12px}
  .card{background:#fff;border-radius:22px;padding:20px 18px;flex:1;display:flex;flex-direction:column;justify-content:center;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,.18)}
  .trial{align-self:flex-start;background:#EAF2ED;color:#2F6B4F;font-size:13px;font-weight:800;border-radius:999px;padding:6px 12px}
  .name{font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#2F6B4F}
  .price{font-size:52px;font-weight:800;letter-spacing:-1.5px;line-height:1}
  .per{font-size:17px;font-weight:500;color:#6b7280;margin-left:4px;letter-spacing:0}
  .tag{font-size:13px;color:#6b7280;line-height:1.35;margin:0}
  ul{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
  li{font-size:14px;font-weight:600;display:flex;gap:8px;align-items:flex-start;line-height:1.3}
  li:before{content:"✓";color:#2F6B4F;font-weight:800}
  .cta{background:#fff;color:#2F6B4F;border-radius:16px;text-align:center;padding:14px;font-size:17px;font-weight:800}
  .note{color:#CFE0D6;font-size:11px;text-align:center}
</style></head><body><div class="wrap">
  <div class="card">
    <div class="trial">Prueba ${trialLabel()}</div>
    <div class="name">${PLAN.name}</div>
    <div class="price">${priceLabel().replace(" ", "")}<span class="per">al ${PLAN.period}</span></div>
    <p class="tag">Después de la prueba, pagas mes a mes por Nequi. Sin cuaderno y sin complicarte.</p>
    <ul>${highlights.map((h) => `<li>${h}</li>`).join("")}</ul>
  </div>
  <div class="cta">${cta}</div>
  <div class="note">Precio en pesos colombianos · No incluye facturación electrónica DIAN</div>
</div></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 })).newPage();
  await page.setContent(html);
  await page.waitForTimeout(500);
  const png = path.join(escenasDir, "16-planes.png");
  await page.screenshot({ path: png });
  await browser.close();

  const out = path.join(escenasDir, "16-planes.mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-loop", "1", "-framerate", "30", "-i", png, "-t", String(duration),
    "-vf", "scale=1080:1920,format=yuv420p", "-c:v", "libx264", "-preset", "fast", "-crf", "14", "-an", out]);
  fs.rmSync(png);

  const jsonPath = path.join(escenasDir, "escenas.json");
  const info = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  info.escenas = info.escenas.filter((e: { id: string }) => e.id !== "16-planes");
  info.escenas.push({ id: "16-planes", duracion: duration, fotogramas: Math.round(duration * 30) });
  fs.writeFileSync(jsonPath, JSON.stringify(info, null, 2));
  console.log(`Escena de precio: ${out} (${priceLabel()}/${PLAN.period})`);
})();
