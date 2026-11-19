// ======================================================
// Archivo: scripts/generate-icons.mjs
// Responsabilidad: Regenerar los íconos PNG de la PWA a partir de los SVG de public/.
//   - pwa-icon-source.svg   -> pwa-icon-192.png, pwa-icon-512.png (purpose "any")
//   - pwa-icon-maskable.svg -> pwa-icon-maskable-512.png (purpose "maskable")
// Uso: node scripts/generate-icons.mjs   (usa la devDependency @resvg/resvg-js)
// ======================================================
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

const publicDir = resolve(import.meta.dirname, "../public");

function render(svgName, size, outName) {
  const svg = readFileSync(resolve(publicDir, svgName));
  const png = new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
  writeFileSync(resolve(publicDir, outName), png);
  console.log(`${outName} (${size}x${size}, ${png.length} bytes)`);
}

render("pwa-icon-source.svg", 192, "pwa-icon-192.png");
render("pwa-icon-source.svg", 512, "pwa-icon-512.png");
render("pwa-icon-maskable.svg", 512, "pwa-icon-maskable-512.png");

// pwa-icon.svg se mantiene idéntico al ícono fuente (favicon vectorial).
copyFileSync(resolve(publicDir, "pwa-icon-source.svg"), resolve(publicDir, "pwa-icon.svg"));
