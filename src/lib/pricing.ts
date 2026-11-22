// ======================================================
// Archivo: pricing.ts
// Responsabilidad: ÚNICA fuente del plan y precio de Tiendly. La usan la página pública /planes,
//   el manual en PDF (scripts/generate-user-manual.ts) y la escena de precio del video.
// Para cambiar el precio edita PLAN.priceCop y vuelve a generar el manual y el video.
// ======================================================
import { formatMoney } from "./format";

export const PLAN = {
  name: "Tiendly Barrio",
  /** Pesos colombianos por mes. Referencia de mercado: ver marketing/radar-clientes.md. */
  priceCop: 29900,
  period: "mes",
  /** Días de prueba gratis antes del primer cobro. */
  trialDays: 7,
  tagline: "Todo lo que necesita una tienda de barrio, por menos de $1.000 al día.",
  includes: [
    "Ventas con cobro en efectivo, tarjeta, transferencia o fiado",
    "Inventario con alerta de lo que se está acabando",
    "Control de fiados: quién te debe y cuándo vence",
    "Tareas diarias de apertura y cierre",
    "Asistente de inteligencia artificial con los datos de tu negocio",
    "Carga masiva de productos desde Excel o CSV",
    "Funciona en celular y computador; si se va la señal, sigue vendiendo",
  ],
  notIncluded: ["Facturación electrónica DIAN"],
} as const;

/** "$ 29.900" */
export function priceLabel(): string {
  return formatMoney(PLAN.priceCop);
}

/** Lee una variable pública (Vite en el navegador, process.env en los scripts de Node). */
function readEnv(name: string): string {
  const fromVite = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[name];
  const fromNode = typeof process !== "undefined" ? process.env?.[name] : undefined;
  return (fromVite ?? fromNode ?? "").trim();
}

/** WhatsApp de ventas (Colombia +57 304 476 9592). Se puede sobrescribir con VITE_WHATSAPP_NUMBER. */
export const DEFAULT_WHATSAPP = "573044769592";

/** Número de WhatsApp de ventas, solo dígitos con indicativo. */
export function whatsappNumber(): string {
  return readEnv("VITE_WHATSAPP_NUMBER").replace(/\D/g, "") || DEFAULT_WHATSAPP;
}

/** "+57 304 476 9592" para mostrarlo en pantalla, manual y video. */
export function whatsappDisplay(number: string = whatsappNumber()): string {
  const m = number.match(/^57(\d{3})(\d{3})(\d{4})$/);
  return m ? `+57 ${m[1]} ${m[2]} ${m[3]}` : `+${number}`;
}

/** "7 días gratis" */
export function trialLabel(): string {
  return `${PLAN.trialDays} días gratis`;
}

export interface LeadInfo {
  name: string;
  business: string;
  source: string;
}

/**
 * Datos del cliente potencial que llegan en el enlace (por ejemplo desde Radar Clientes):
 * /planes?n=Marta&negocio=Tienda%20La%20Esquina&fuente=radar
 * Se limpian porque vienen de una URL que cualquiera puede escribir.
 */
export function parseLead(search: string): LeadInfo {
  const params = new URLSearchParams(search);
  const clean = (value: string | null, max: number) =>
    (value ?? "")
      .normalize("NFC")
      .replace(/[^\p{L}\p{N} .,&'’\-]/gu, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max);
  return { name: clean(params.get("n"), 40), business: clean(params.get("negocio"), 60), source: clean(params.get("fuente"), 30) };
}

/** Mensaje que el cliente envía por WhatsApp al pedir la suscripción. */
export function subscriptionMessage(lead: LeadInfo): string {
  const who = lead.name ? `Soy ${lead.name}${lead.business ? ` de ${lead.business}` : ""}.` : lead.business ? `Mi negocio es ${lead.business}.` : "";
  const from = lead.source ? ` (Vengo de: ${lead.source})` : "";
  return `Hola, ${who} Quiero suscribirme a Tiendly (${priceLabel()} al mes, después de la prueba gratis).${from}`.replace("Hola,  ", "Hola, ");
}

/** Enlace de WhatsApp con el mensaje precargado, o null si aún no hay número configurado. */
export function subscriptionUrl(lead: LeadInfo, number: string = whatsappNumber()): string | null {
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(subscriptionMessage(lead))}`;
}
