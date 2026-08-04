// ======================================================
// Archivo: scripts/generate-user-manual.ts
// Responsabilidad: Genera docs/Manual-de-Usuario-BarrioPro.pdf a partir de
//                   las capturas reales en docs/manual-assets/, usando el
//                   propio motor de impresión de Chrome (vía Puppeteer)
//                   en vez de una librería de PDF corriendo en Node — más
//                   robusto y compatible con lectores estrictos como
//                   Adobe Acrobat.
//
// Requisitos: Google Chrome instalado localmente (no se descarga nada) y
// la dependencia de desarrollo "puppeteer-core".
//
// Uso: npx tsx scripts/generate-user-manual.ts
//
// Para actualizar el manual cuando cambie el diseño de la app: reemplaza
// las imágenes en docs/manual-assets/ (mismos nombres de archivo) y vuelve
// a correr este script.
// ======================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, "../docs/manual-assets");
const OUTPUT_PATH = path.resolve(__dirname, "../docs/Manual-de-Usuario-BarrioPro.pdf");

const CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
];

function findChrome(): string {
  const found = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(
      "No se encontró Chrome/Edge instalado en las rutas conocidas. Instala Google Chrome o edita CHROME_CANDIDATES en este script."
    );
  }
  return found;
}

function imageDataUrl(filename: string): string {
  const buf = fs.readFileSync(path.join(ASSETS_DIR, filename));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

interface Section {
  badge: string;
  title: string;
  intro: string;
  steps: string[];
  tip?: string;
  image: string;
}

const sections: Section[] = [
  {
    badge: "PRIMEROS PASOS",
    title: "Iniciar sesión y crear tu cuenta",
    intro:
      "BarrioPro funciona desde el navegador de tu celular, tablet o computador — no necesitas instalar nada para empezar. Cada tienda tiene su propia cuenta y sus datos están completamente separados de los de otras tiendas.",
    steps: [
      "Abre la dirección de BarrioPro que te compartió tu proveedor del servicio.",
      "La primera vez, toca \u201cCrear Cuenta\u201d, escribe el nombre de tu negocio, tu correo y una contraseña de al menos 6 caracteres.",
      "Revisa tu correo: te llegará un enlace de confirmación. Debes confirmarlo antes de poder ingresar.",
      "Ya confirmado, vuelve a la pantalla de \u201cIniciar Sesión\u201d con tu correo y contraseña.",
      "Si tu navegador lo permite, puedes instalar BarrioPro como una aplicación en tu dispositivo tocando \u201cInstalar App en este Dispositivo\u201d, para abrirla como cualquier otra app.",
    ],
    tip: "Guarda bien tu contraseña. Si compartes el dispositivo con empleados o familiares, configura además un PIN de 4 dígitos desde Ajustes de Negocio para proteger la información de tu caja.",
    image: "00-login.png",
  },
  {
    badge: "MÓDULO 1",
    title: "Panel de Control",
    intro:
      "Es la pantalla principal: un vistazo rápido a cómo va tu negocio hoy. Aquí ves tus ventas del día comparadas con ayer, cuántos productos tienen stock crítico, el total de transacciones, y un gráfico con el historial de ventas de los últimos días.",
    steps: [
      "\u201cRegistrar Venta\u201d abre un cobro rápido en efectivo, ideal para ventas de mostrador simples.",
      "\u201cExportar Reporte PDF\u201d genera un informe completo con tus ventas del mes, el estado del inventario y las alertas de reposición.",
      "La tarjeta \u201cInventario Crítico\u201d te muestra de un vistazo qué productos necesitan reabastecerse pronto.",
      "Si es tu primera vez usando la app, puedes usar el botón \u201cSembrar Datos Demo\u201d para explorar BarrioPro con información de ejemplo antes de cargar tu inventario real.",
    ],
    image: "01-dashboard.png",
  },
  {
    badge: "MÓDULO 2",
    title: "Inventario",
    intro:
      "Aquí administras todo tu catálogo de productos: nombre, categoría, SKU (código), stock disponible, costo y precio de venta. La app calcula automáticamente el valor de tu inventario y te avisa cuándo un producto está por agotarse.",
    steps: [
      "\u201cNuevo Producto\u201d abre un formulario para agregar un artículo uno por uno.",
      "\u201cCarga Masiva (Excel)\u201d te permite subir muchos productos de una sola vez desde una plantilla de Excel — ideal para arrancar con tu inventario completo.",
      "El botón \u201cStock Crítico\u201d filtra únicamente los productos que necesitan reposición urgente (30% o menos de su stock mínimo configurado).",
      "En cada fila puedes ajustar el stock rápidamente con los botones +/-, o editar/eliminar el producto con los íconos de la columna \u201cAcciones\u201d.",
      "Usa la barra de búsqueda o los filtros por categoría para encontrar productos específicos rápidamente.",
    ],
    tip: "El SKU (código) es opcional al crear un producto — si lo dejas vacío, BarrioPro genera uno automáticamente.",
    image: "02-inventory.png",
  },
  {
    badge: "MÓDULO 3",
    title: "Caja y Ventas",
    intro:
      "El punto de venta (POS) de BarrioPro: aquí registras cada venta del día. A la izquierda buscas y agregas productos al carrito; a la derecha completas los datos del cobro.",
    steps: [
      "Busca el producto por nombre o SKU, o navega por categoría, y tócalo (o presiona Enter) para agregarlo al carrito.",
      "Ajusta la cantidad de cada producto con los botones +/- del carrito.",
      "Elige el método de pago: Efectivo, Tarjeta, Transferencia o Fiado. Si eliges Fiado, deberás indicar el nombre del cliente y la fecha en que te pagará — esa cuenta aparecerá automáticamente en el módulo de Deudas.",
      "Presiona \u201cRegistrar Venta\u201d para completar el cobro. El stock de cada producto se descuenta automáticamente.",
      "En el panel derecho puedes ver tus últimas ventas, imprimir el recibo en PDF de cualquiera de ellas, editarlas o eliminarlas si te equivocaste.",
    ],
    tip: "Usa las flechas ↑↓ y la tecla Enter en el buscador de productos para agregar artículos al carrito sin tocar la pantalla — muy útil si usas un lector de código de barras.",
    image: "03-sales.png",
  },
  {
    badge: "MÓDULO 4",
    title: "Checklist Diario",
    intro:
      "Una lista de tareas para tus rutinas del día a día: abrir la tienda, revisar vencimientos, cuadrar la caja, o cualquier pendiente operativo que no quieras olvidar.",
    steps: [
      "Escribe la tarea en el campo de texto y presiona \u201cAñadir Tarea\u201d.",
      "Toca el círculo junto a una tarea pendiente para marcarla como completada (y viceversa).",
      "Pasa el cursor sobre una tarea para ver los íconos de editar y eliminar.",
      "Las tareas completadas quedan agrupadas en el panel derecho para que tengas un registro de lo que ya hiciste.",
    ],
    image: "04-checklist.png",
  },
  {
    badge: "MÓDULO 5",
    title: "Deudas / Clientes Fiados",
    intro:
      "Lleva el control de las cuentas que tus clientes te deben ('fiado'), para que ningún cobro se te pierda. Las cuentas creadas automáticamente desde una venta Fiado también aparecen aquí.",
    steps: [
      "\u201cNueva Cuenta Fiada\u201d te permite registrar manualmente una deuda: nombre del cliente, monto y fecha de vencimiento.",
      "La lista de \u201cCuentas Pendientes por Cobrar\u201d se ordena automáticamente mostrando primero las vencidas o más próximas a vencer.",
      "Toca el ícono de check para marcar una cuenta como pagada (te pedirá confirmación); el ícono de papelera la elimina definitivamente.",
      "Las cuentas ya pagadas quedan en el historial de la derecha, y puedes reabrirlas si fue un error.",
    ],
    image: "05-debts.png",
  },
  {
    badge: "MÓDULO 6",
    title: "Ajustes de Negocio",
    intro:
      "Configura los datos de tu negocio, gestiona tu catálogo, la seguridad de tu cuenta y tus preferencias de notificaciones.",
    steps: [
      "\u201cPerfil del Negocio\u201d: nombre comercial, dirección, horario, logo y el umbral general de stock bajo.",
      "\u201cGestión de Catálogo\u201d: otra forma de administrar tus productos y exportar tu inventario a Excel.",
      "\u201cSeguridad e Inicialización\u201d: configura tu PIN de 4 dígitos para bloquear el panel, o carga datos de demostración.",
      "\u201cNotificaciones Locales\u201d: activa avisos del navegador para enterarte al instante cuando un producto esté por agotarse o tengas tareas pendientes.",
    ],
    image: "06-settings.png",
  },
  {
    badge: "ASISTENTE",
    title: "BarrioPro AI",
    intro:
      "El botón flotante con el ícono de estrella, visible en cualquier pantalla, abre tu asesor comercial con inteligencia artificial. Tiene acceso a tu inventario y ventas reales para darte recomendaciones concretas.",
    steps: [
      "Pregúntale qué productos debes reponer y por qué es urgente.",
      "Pídele ideas de promociones o combos basados en tus ventas recientes.",
      "Consúltale recomendaciones generales para mejorar la administración de tu tienda.",
      "Usa las preguntas sugeridas para empezar rápido, o escribe tu propia pregunta en el campo de texto.",
    ],
    tip: "Debes tener la sesión iniciada para usar el asistente — es información real y privada de tu negocio.",
    image: "07-ai-assistant.png",
  },
];

function renderSteps(steps: string[]): string {
  return steps.map((s) => `<li>${s}</li>`).join("\n");
}

function renderTip(tip?: string): string {
  if (!tip) return "";
  return `<div class="tip"><span class="tip-label">Consejo</span><p>${tip}</p></div>`;
}

function buildHtml(): string {
  const today = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });

  const sectionHtml = sections
    .map(
      (s, idx) => `
    <section class="module-page">
      <div class="module-header">
        <span class="badge">${s.badge}</span>
        <h1>${idx + 1}. ${s.title}</h1>
      </div>
      <div class="module-body">
        <p class="intro">${s.intro}</p>
        <h3>¿Cómo usarlo?</h3>
        <ul class="steps">${renderSteps(s.steps)}</ul>
        ${renderTip(s.tip)}
        <div class="screenshot-frame">
          <img src="${imageDataUrl(s.image)}" alt="${s.title}" />
        </div>
      </div>
      <div class="footer">BarrioPro — Manual de Usuario</div>
    </section>`
    )
    .join("\n");

  const tocHtml = sections
    .map((s, idx) => `<li><span class="toc-num">${idx + 1}.</span> ${s.title}</li>`)
    .join("\n");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; margin: 0; color: #212121; }
  .cover {
    width: 210mm; height: 297mm; background: #3A4A3A; color: #fff;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    page-break-after: always; text-align: center;
  }
  .cover h1 { font-size: 52px; margin: 0; font-weight: 800; }
  .cover h2 { font-size: 20px; font-weight: 400; margin: 10px 0 20px; }
  .cover hr { width: 60px; border: none; border-top: 2px solid #4CAF50; margin: 0 0 20px; }
  .cover p { font-size: 13px; color: #d7e0d7; margin: 2px 0; }
  .cover .date { position: absolute; bottom: 25mm; font-size: 11px; color: #b4c9b4; }

  .toc-page { width: 210mm; min-height: 297mm; padding: 25mm 15mm; page-break-after: always; }
  .toc-page h1 { font-size: 24px; border-bottom: 2px solid #3A4A3A; padding-bottom: 8px; }
  .toc-page ul { list-style: none; padding: 0; margin-top: 20px; }
  .toc-page li { font-size: 14px; font-weight: 600; padding: 7px 0; }
  .toc-num { color: #3A4A3A; font-weight: 800; margin-right: 8px; }
  .toc-note { margin-top: 30px; font-size: 10.5px; color: #6b7280; font-style: italic; }

  .module-page { width: 210mm; min-height: 297mm; page-break-after: always; position: relative; padding-bottom: 20mm; }
  .module-header { background: #3A4A3A; color: #fff; padding: 12mm 15mm 8mm; }
  .badge { font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #c8e6c9; }
  .module-header h1 { font-size: 21px; margin: 4px 0 0; }
  .module-body { padding: 8mm 15mm 0; }
  .intro { font-size: 11.5px; line-height: 1.55; }
  .module-body h3 { font-size: 12.5px; color: #3A4A3A; margin: 14px 0 6px; }
  .steps { padding-left: 5mm; margin: 0 0 10px; }
  .steps li { font-size: 10.5px; line-height: 1.5; margin-bottom: 5px; padding-left: 2px; }
  .steps li::marker { color: #4CAF50; }
  .tip { background: #f5f7f2; border: 1px solid #4CAF50; border-radius: 4px; padding: 8px 12px; margin-bottom: 10px; }
  .tip-label { font-size: 10px; font-weight: 700; color: #3A4A3A; display: block; margin-bottom: 3px; }
  .tip p { font-size: 10px; margin: 0; line-height: 1.5; }
  .screenshot-frame { border: 1px solid #ddd; border-radius: 4px; overflow: hidden; margin-top: 6px; }
  .screenshot-frame img { width: 100%; display: block; }
  .footer { position: absolute; bottom: 8mm; left: 15mm; right: 15mm; font-size: 8px; color: #6b7280; display: flex; justify-content: space-between; }
</style>
</head>
<body>
  <div class="cover">
    <h1>BarrioPro</h1>
    <h2>Manual de Usuario</h2>
    <hr />
    <p>Gestión de inventario, ventas, fiados y rutinas diarias</p>
    <p>para tiendas de barrio, abarrotes y comercios locales</p>
    <div class="date">Actualizado: ${today}</div>
  </div>

  <div class="toc-page">
    <h1>Contenido</h1>
    <ul>${tocHtml}</ul>
    <p class="toc-note">Nota: las capturas de pantalla de este manual usan datos de demostración con fines ilustrativos, no información real de ninguna tienda.</p>
  </div>

  ${sectionHtml}
</body>
</html>`;
}

async function main() {
  const html = buildHtml();
  const chromePath = findChrome();

  const browser = await puppeteer.launch({ executablePath: chromePath, headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, pdfBuffer);
    console.log(`Manual generado: ${OUTPUT_PATH} (${(pdfBuffer.length / 1024).toFixed(0)} KB)`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
