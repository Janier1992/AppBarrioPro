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

// ---- Pago por Nequi (transferencia manual mientras no exista una pasarela de pagos) ----

/** Número de Nequi que recibe los pagos: variable de entorno VITE_NEQUI_NUMBER (10 dígitos, ej. 3001234567). */
export function nequiNumber(): string {
  const digits = readEnv("VITE_NEQUI_NUMBER").replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("57") ? digits.slice(2) : digits; // admite +57
  return local.length === 10 ? local : "";
}

/** "300 123 4567" */
export function nequiDisplay(number: string = nequiNumber()): string {
  return number.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3");
}

/**
 * Referencia corta y única por cuenta ("TDLY-A1B2C3"). El cliente la escribe en el mensaje de la transferencia
 * para que soporte sepa a qué negocio corresponde el pago; también se puede buscar en el portal /admin.
 */
export function paymentReference(userId: string): string {
  const code = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase().padEnd(6, "0");
  return `TDLY-${code}`;
}

/** Mensaje con el que el cliente avisa por WhatsApp que ya pagó (y adjunta el comprobante). */
export function paidMessage(userId: string, businessName?: string): string {
  const negocio = businessName ? ` Mi negocio es ${businessName}.` : "";
  return `Hola, ya pagué mi suscripción de Tiendly (${priceLabel()}) por Nequi.${negocio} Referencia: ${paymentReference(userId)}. Te envío el comprobante.`;
}

export function paidUrl(userId: string, businessName?: string, number: string = whatsappNumber()): string | null {
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(paidMessage(userId, businessName))}` : null;
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
