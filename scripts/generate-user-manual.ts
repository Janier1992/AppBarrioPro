// ======================================================
// Archivo: scripts/generate-user-manual.ts
// Responsabilidad: Genera docs/Manual-de-Usuario-BarrioPro.pdf a partir de
//                   las capturas reales en docs/manual-assets/.
// Uso: npx tsx scripts/generate-user-manual.ts
//
// Para actualizar el manual cuando cambie el diseño de la app: reemplaza
// las imágenes en docs/manual-assets/ (mismos nombres de archivo) y vuelve
// a correr este script.
// ======================================================

import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, "../docs/manual-assets");
const OUTPUT_PATH = path.resolve(__dirname, "../docs/Manual-de-Usuario-BarrioPro.pdf");

const PRIMARY = [58, 74, 58]; // #3A4A3A, verde de marca BarrioPro
const ACCENT = [76, 175, 80]; // #4CAF50
const TEXT = [33, 33, 33];
const MUTED = [107, 114, 128];

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
      "La primera vez, toca \"Crear Cuenta\", escribe el nombre de tu negocio, tu correo y una contraseña de al menos 6 caracteres.",
      "Revisa tu correo: te llegará un enlace de confirmación. Debes confirmarlo antes de poder ingresar.",
      "Ya confirmado, vuelve a la pantalla de \"Iniciar Sesión\" con tu correo y contraseña.",
      "Si tu navegador lo permite, puedes instalar BarrioPro como una aplicación en tu dispositivo tocando \"Instalar App en este Dispositivo\", para abrirla como cualquier otra app.",
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
      "\"Registrar Venta\" abre un cobro rápido en efectivo, ideal para ventas de mostrador simples.",
      "\"Exportar Reporte PDF\" genera un informe completo con tus ventas del mes, el estado del inventario y las alertas de reposición.",
      "La tarjeta \"Inventario Crítico\" te muestra de un vistazo qué productos necesitan reabastecerse pronto.",
      "Si es tu primera vez usando la app, puedes usar el botón \"Sembrar Datos Demo\" para explorar BarrioPro con información de ejemplo antes de cargar tu inventario real.",
    ],
    image: "01-dashboard.png",
  },
  {
    badge: "MÓDULO 2",
    title: "Inventario",
    intro:
      "Aquí administras todo tu catálogo de productos: nombre, categoría, SKU (código), stock disponible, costo y precio de venta. La app calcula automáticamente el valor de tu inventario y te avisa cuándo un producto está por agotarse.",
    steps: [
      "\"Nuevo Producto\" abre un formulario para agregar un artículo uno por uno.",
      "\"Carga Masiva (Excel)\" te permite subir muchos productos de una sola vez desde una plantilla de Excel — ideal para arrancar con tu inventario completo.",
      "El botón \"Stock Crítico\" filtra únicamente los productos que necesitan reposición urgente (30% o menos de su stock mínimo configurado).",
      "En cada fila puedes ajustar el stock rápidamente con los botones +/-, o editar/eliminar el producto con los íconos de la columna \"Acciones\".",
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
      "Presiona \"Registrar Venta\" para completar el cobro. El stock de cada producto se descuenta automáticamente.",
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
      "Escribe la tarea en el campo de texto y presiona \"Añadir Tarea\".",
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
      "\"Nueva Cuenta Fiada\" te permite registrar manualmente una deuda: nombre del cliente, monto y fecha de vencimiento.",
      "La lista de \"Cuentas Pendientes por Cobrar\" se ordena automáticamente mostrando primero las vencidas o más próximas a vencer.",
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
      "\"Perfil del Negocio\": nombre comercial, dirección, horario, logo y el umbral general de stock bajo.",
      "\"Gestión de Catálogo\": otra forma de administrar tus productos y exportar tu inventario a Excel.",
      "\"Seguridad e Inicialización\": configura tu PIN de 4 dígitos para bloquear el panel, o carga datos de demostración.",
      "\"Notificaciones Locales\": activa avisos del navegador para enterarte al instante cuando un producto esté por agotarse o tengas tareas pendientes.",
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

function addCoverPage(doc: jsPDF) {
  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.rect(0, 0, 210, 297, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(42);
  doc.text("BarrioPro", 105, 120, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.text("Manual de Usuario", 105, 135, { align: "center" });

  doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.setLineWidth(1);
  doc.line(75, 145, 135, 145);

  doc.setFontSize(11);
  doc.setTextColor(220, 230, 220);
  doc.text("Gestión de inventario, ventas, fiados y rutinas diarias", 105, 158, { align: "center" });
  doc.text("para tiendas de barrio, abarrotes y comercios locales", 105, 165, { align: "center" });

  const today = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  doc.setFontSize(9);
  doc.setTextColor(180, 195, 180);
  doc.text(`Actualizado: ${today}`, 105, 270, { align: "center" });
}

function addTableOfContents(doc: jsPDF) {
  doc.addPage();
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Contenido", 15, 25);
  doc.setDrawColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.setLineWidth(0.6);
  doc.line(15, 29, 195, 29);

  let y = 45;
  sections.forEach((s, idx) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
    doc.text(`${idx + 1}.`, 15, y);
    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    doc.text(s.title, 25, y);
    y += 12;
  });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(
    "Nota: las capturas de pantalla de este manual usan datos de demostración con fines\nilustrativos, no información real de ninguna tienda.",
    15,
    y + 8
  );
}

function addFooter(doc: jsPDF, pageNum: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text("BarrioPro — Manual de Usuario", 15, 291);
  doc.text(`Página ${pageNum}`, 195, 291, { align: "right" });
}

function addSection(doc: jsPDF, section: Section, index: number, pageNum: { n: number }) {
  doc.addPage();
  pageNum.n++;

  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.rect(0, 0, 210, 32, "F");

  doc.setTextColor(200, 230, 200);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(section.badge, 15, 13);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text(`${index + 1}. ${section.title}`, 15, 24);

  let y = 42;
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const introLines = doc.splitTextToSize(section.intro, 180);
  doc.text(introLines, 15, y);
  y += introLines.length * 5.2 + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.text("¿Cómo usarlo?", 15, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  section.steps.forEach((step) => {
    const lines = doc.splitTextToSize(step, 170);
    doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.circle(17, y - 1.3, 1.1, "F");
    doc.text(lines, 22, y);
    y += lines.length * 4.6 + 2.2;
  });

  if (section.tip) {
    y += 2;
    const tipLines = doc.splitTextToSize(section.tip, 168);
    const boxHeight = tipLines.length * 4.6 + 8;
    doc.setFillColor(245, 247, 242);
    doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(15, y, 180, boxHeight, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
    doc.text("Consejo", 19, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    doc.text(tipLines, 19, y + 11.5);
    y += boxHeight + 6;
  } else {
    y += 4;
  }

  // Screenshot — fit to remaining space, capped so it never overflows the page
  const imgData = imageDataUrl(section.image);
  const imgWidthMm = 180;
  const imgHeightMm = imgWidthMm * (900 / 1440);
  const maxHeight = 268 - y;
  const finalHeight = Math.min(imgHeightMm, maxHeight);
  const finalWidth = finalHeight * (1440 / 900);
  const x = (210 - finalWidth) / 2;

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(x - 1, y - 1, finalWidth + 2, finalHeight + 2, 2, 2, "S");
  doc.addImage(imgData, "PNG", x, y, finalWidth, finalHeight, undefined, "FAST");

  addFooter(doc, pageNum.n);
}

function main() {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageNum = { n: 1 };

  addCoverPage(doc);
  addTableOfContents(doc);
  pageNum.n = 2;

  sections.forEach((section, idx) => addSection(doc, section, idx, pageNum));

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  fs.writeFileSync(OUTPUT_PATH, pdfBuffer);
  console.log(`Manual generado: ${OUTPUT_PATH} (${(pdfBuffer.length / 1024).toFixed(0)} KB, ${sections.length + 2} páginas)`);
}

main();
