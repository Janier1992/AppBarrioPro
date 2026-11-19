// ======================================================
// Archivo: scripts/generate-user-manual.ts
// Responsabilidad: Genera docs/Manual-de-Usuario-Tiendly.pdf a partir de
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
const OUTPUT_PATH = path.resolve(__dirname, "../docs/Manual-de-Usuario-Tiendly.pdf");

const CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
];

function findChrome(): string {
  // Permite indicar el binario explícitamente (CI, contenedores): CHROME_PATH=/ruta/a/chrome
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
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
      "Tiendly funciona desde el navegador de tu celular, tablet o computador — no necesitas instalar nada para empezar. Cada tienda tiene su propia cuenta y sus datos están completamente separados de los de otras tiendas.",
    steps: [
      "Abre la dirección de Tiendly que te compartió tu proveedor del servicio.",
      "La primera vez, toca “Crear Cuenta”, escribe el nombre de tu negocio, tu correo y una contraseña de al menos 6 caracteres.",
      "Revisa tu correo: te llegará un enlace de confirmación. Debes confirmarlo antes de poder ingresar.",
      "Ya confirmado, vuelve a “Iniciar Sesión”. Toca el ojo del campo de contraseña si quieres ver lo que escribes.",
      "Si olvidaste tu contraseña, toca “¿Olvidaste tu contraseña?”: te enviamos un código por correo para crear una nueva.",
      "En el celular, la barra inferior tiene cuatro destinos (Hoy, Productos, Vender y Fiados) y un botón “Más” con Tareas, Ajustes y el Asistente. En el computador, esos destinos están en la barra superior y en el menú de tu tienda (arriba a la derecha).",
      "Si tu navegador lo permite, puedes instalar Tiendly como una aplicación en tu dispositivo (opción en Ajustes, o “Agregar a pantalla de inicio”) para abrirla como cualquier otra app.",
      "Tiendly sirve para tiendas, panaderías, fruver, ferreterías, papelerías, droguerías y otros negocios de barrio. En Hoy (o en Ajustes) elige tu tipo de negocio: así te sugerimos las categorías y tareas que usa tu negocio. Es opcional y no limita nada.",
    ],
    tip: "Guarda bien tu contraseña. Si compartes el dispositivo con empleados o familiares, configura además un PIN de 4 dígitos desde Ajustes para proteger la información de tu caja.",
    image: "00-login.png",
  },
  {
    badge: "MÓDULO 1",
    title: "Hoy",
    intro:
      "La pantalla principal responde una sola pregunta: ¿cómo va el día? Arriba ves cuánto has vendido hoy y cuántas ventas llevas; debajo, la lista “Para hoy” reúne en un solo lugar lo que no debes olvidar.",
    steps: [
      "“Nueva venta” te lleva directo a Vender. Es la acción principal de la pantalla.",
      "“Para hoy” junta tres cosas, ordenadas por urgencia: fiados vencidos o por cobrar (botón “Cobrar”), productos que se acaban (botón “Pedir”) y tareas pendientes (botón “Listo”, que la marca como hecha ahí mismo).",
      "“Pregúntale a Tiendly” abre el asistente con inteligencia artificial.",
      "“Ver gráficos y reporte” despliega el historial de ventas, los productos más vendidos y el botón para exportar el reporte del mes en PDF.",
      "Si es tu primera vez, usa “Probar con datos de ejemplo” para explorar Tiendly con información ficticia antes de cargar tu inventario real.",
    ],
    image: "01-dashboard.png",
  },
  {
    badge: "MÓDULO 2",
    title: "Productos",
    intro:
      "Aquí administras tu catálogo: nombre, categoría, código, stock, costo y precio. Los productos que se acaban se marcan en naranja como “Quedan 3” para que los veas sin buscar.",
    steps: [
      "“Nuevo producto” abre un formulario para agregar un artículo.",
      "“Importar Excel” permite subir muchos productos de una sola vez desde una plantilla — ideal para arrancar con tu inventario completo.",
      "La categoría se elige de las sugerencias de tu tipo de negocio o la escribes tú: puedes usar cualquiera (por ejemplo “Empanadas” o “Tornillería”). Al importar desde Excel se conserva la categoría que escribiste.",
      "El filtro “Se acaban” muestra solo los productos con 30 % o menos de su stock mínimo; “Todos” los muestra todos. También puedes filtrar por categoría o buscar por nombre.",
      "En el celular, cada fila tiene el botón “+ Reponer”, que abre la edición del producto para actualizar su stock. En el computador verás la tabla completa, con costo, precio y botones para ajustar el stock con −/+, editar o eliminar.",
      "“Ver cifras del inventario” despliega el valor estimado y la inversión en stock.",
    ],
    tip: "El código (SKU) es opcional al crear un producto — si lo dejas vacío, Tiendly genera uno automáticamente.",
    image: "02-inventory.png",
  },
  {
    badge: "MÓDULO 3",
    title: "Vender y Cobrar",
    intro:
      "Registrar una venta son dos pasos: elegir los productos y cobrar. Mientras vendes no hay menú, para que te concentres en terminar la venta.",
    steps: [
      "Busca el producto o tócalo en las fichas grandes. Cada toque suma una unidad; usa las categorías para filtrar.",
      "En el celular aparece abajo la barra “3 productos · $ 8,80 · Cobrar”. Tócala para pasar a la pantalla de cobro. En el computador, el carrito siempre está a la derecha.",
      "En el carrito ajusta las cantidades con −/+ o quita un producto con el ícono de papelera.",
      "Elige la forma de pago: Efectivo, Tarjeta, Transferencia o Fiado. Con Fiado debes indicar el nombre del cliente y la fecha en que pagará: la cuenta aparece sola en Fiados.",
      "Toca “Cobrar”. El stock se descuenta automáticamente y puedes imprimir el recibo en PDF.",
      "“Ver ventas registradas” (al final) muestra las últimas ventas, para editarlas, eliminarlas o exportar las del mes.",
    ],
    tip: "Usa las flechas ↑↓ y la tecla Enter en el buscador para agregar productos sin tocar la pantalla — muy útil si usas un lector de código de barras.",
    image: "03-sales.png",
  },
  {
    badge: "MÓDULO 4",
    title: "Fiados",
    intro:
      "Lo que tus clientes te deben, en una cifra: “Te deben $ 125.700”. Las cuentas creadas desde una venta Fiado también aparecen aquí, ordenadas para cobrar primero las vencidas.",
    steps: [
      "“Nuevo fiado” registra una deuda a mano: cliente, monto y fecha de vencimiento.",
      "Cada fila muestra el nombre, cuándo vence (“Venció hace 7 días”, “Vence el 25/11”) y el monto.",
      "“Cobrar” marca la cuenta como pagada (te pide confirmación). El ícono de papelera la elimina.",
      "“Ya cobrados”, al final, guarda el historial y permite reabrir una cuenta si te equivocaste.",
    ],
    image: "05-debts.png",
  },
  {
    badge: "MÓDULO 5",
    title: "Tareas",
    intro:
      "Una lista para tus rutinas de apertura, operación y cierre: abrir la caja, revisar vencimientos, cuadrar al final del día. Se encuentra en “Más” (celular) o en el menú de tu tienda (computador).",
    steps: [
      "Si aún no tienes tareas, Tiendly te ofrece las sugeridas para tu tipo de negocio (apertura, durante el día y cierre); tócalas con “Agregar las sugeridas”.",
      "Escribe la tarea y toca “Añadir Tarea”.",
      "Toca el círculo junto a una tarea para marcarla como completada (y de nuevo para desmarcarla).",
      "Pasa el cursor sobre una tarea para editarla o eliminarla.",
      "Las tareas pendientes también aparecen en “Para hoy”, en la pantalla Hoy.",
    ],
    image: "04-checklist.png",
  },
  {
    badge: "MÓDULO 6",
    title: "Ajustes",
    intro:
      "Configura los datos de tu negocio, la seguridad de tu cuenta y tus avisos. Se abre desde “Más” (celular) o desde el menú de tu tienda (computador).",
    steps: [
      "“Perfil del Negocio”: tipo de negocio, nombre comercial, dirección, horario, logo y el umbral general de stock bajo.",
      "“Gestión de Catálogo”: otra forma de administrar tus productos y exportar tu inventario a Excel.",
      "“Seguridad”: configura tu PIN de 4 dígitos para bloquear la app, o carga datos de demostración.",
      "“Notificaciones”: activa avisos del navegador cuando un producto esté por agotarse o tengas tareas pendientes.",
      "En el menú “Más” también cambias entre tema claro y oscuro (con un solo toque), bloqueas la app con tu PIN y cierras sesión.",
    ],
    image: "06-settings.png",
  },
  {
    badge: "ASISTENTE",
    title: "Tiendly AI",
    intro:
      "Tu asesor comercial con inteligencia artificial. Tiene acceso a tu inventario y ventas reales para darte recomendaciones concretas. Se abre con “Pregúntale a Tiendly” en Hoy, o desde “Más” → “Asistente IA”.",
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
      <div class="footer">Tiendly — Manual de Usuario</div>
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
    width: 210mm; height: 297mm; background: #2F6B4F; color: #fff;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    page-break-after: always; text-align: center;
  }
  .cover h1 { font-size: 52px; margin: 0; font-weight: 800; }
  .cover h2 { font-size: 20px; font-weight: 400; margin: 10px 0 20px; }
  .cover hr { width: 60px; border: none; border-top: 2px solid #7FBF9C; margin: 0 0 20px; }
  .cover p { font-size: 13px; color: #ECEBE6; margin: 2px 0; }
  .cover .date { position: absolute; bottom: 25mm; font-size: 11px; color: #CFE0D6; }

  .toc-page { width: 210mm; min-height: 297mm; padding: 25mm 15mm; page-break-after: always; }
  .toc-page h1 { font-size: 24px; border-bottom: 2px solid #2F6B4F; padding-bottom: 8px; }
  .toc-page ul { list-style: none; padding: 0; margin-top: 20px; }
  .toc-page li { font-size: 14px; font-weight: 600; padding: 7px 0; }
  .toc-num { color: #2F6B4F; font-weight: 800; margin-right: 8px; }
  .toc-note { margin-top: 30px; font-size: 10.5px; color: #6b7280; font-style: italic; }

  .module-page { width: 210mm; min-height: 297mm; page-break-after: always; position: relative; padding-bottom: 20mm; }
  .module-header { background: #2F6B4F; color: #fff; padding: 12mm 15mm 8mm; }
  .badge { font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #EAF2ED; }
  .module-header h1 { font-size: 21px; margin: 4px 0 0; }
  .module-body { padding: 8mm 15mm 0; }
  .intro { font-size: 11.5px; line-height: 1.55; }
  .module-body h3 { font-size: 12.5px; color: #2F6B4F; margin: 14px 0 6px; }
  .steps { padding-left: 5mm; margin: 0 0 10px; }
  .steps li { font-size: 10.5px; line-height: 1.5; margin-bottom: 5px; padding-left: 2px; }
  .steps li::marker { color: #7FBF9C; }
  .tip { background: #FAFAF8; border: 1px solid #7FBF9C; border-radius: 4px; padding: 8px 12px; margin-bottom: 10px; }
  .tip-label { font-size: 10px; font-weight: 700; color: #2F6B4F; display: block; margin-bottom: 3px; }
  .tip p { font-size: 10px; margin: 0; line-height: 1.5; }
  .screenshot-frame { border: 1px solid #ddd; border-radius: 4px; overflow: hidden; margin-top: 6px; }
  .screenshot-frame img { width: 100%; display: block; }
  .footer { position: absolute; bottom: 8mm; left: 15mm; right: 15mm; font-size: 8px; color: #6b7280; display: flex; justify-content: space-between; }
</style>
</head>
<body>
  <div class="cover">
    <h1>Tiendly</h1>
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

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    // Como root (contenedores/CI) Chrome exige --no-sandbox.
    args: process.getuid?.() === 0 ? ["--no-sandbox"] : [],
  });
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
