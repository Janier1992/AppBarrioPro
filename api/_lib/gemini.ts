// ======================================================
// Archivo: api/_lib/gemini.ts
// Responsabilidad: Cliente y llamadas a Gemini AI, compartido entre
//                  server.ts (desarrollo local) y las funciones serverless
//                  de Vercel en /api (producción), para evitar que ambas
//                  implementaciones diverjan.
//
// Cambios de seguridad respecto a la versión original:
//  - Ya NO reintenta silenciosamente con la GEMINI_API_KEY del servidor
//    cuando el cliente manda una key propia inválida (evita que cualquiera
//    use el proxy como key gratuita a costa de la cuota del negocio).
//  - Ya NO expone en el mensaje de error qué variables de entorno existen.
//  - Ya NO loggea fragmentos de la API key.
// ======================================================

import { GoogleGenAI } from "@google/genai";
import type { GenerateContentConfig, GenerateContentParameters, GenerateContentResponse } from "@google/genai";

const FALLBACK_MODELS = ["gemini-1.5-flash"];

function getGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "tiendly-backend",
      },
    },
  });
}

export class GeminiConfigError extends Error {}

export async function generateContentWithRetry(options: {
  model: string;
  contents: GenerateContentParameters["contents"];
  config?: GenerateContentConfig;
}): Promise<GenerateContentResponse> {
  // La clave vive SOLO en el servidor (GEMINI_API_KEY). Nunca se acepta ni se guarda una clave
  // enviada por el navegador: así no queda en la base de datos ni viaja en las peticiones.
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new GeminiConfigError(
      "El asistente de IA no está disponible en este momento. Inténtalo más tarde."
    );
  }

  const ai = getGeminiClient(key);
  const modelsToTry = Array.from(new Set([options.model, ...FALLBACK_MODELS]));
  const maxRetries = 3;
  let lastErrorMsg = "";

  for (const currentModel of modelsToTry) {
    let delay = 1000;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await ai.models.generateContent({
          model: currentModel,
          contents: options.contents,
          config: options.config,
        });
      } catch (error) {
        const detalle = error as { message?: string; status?: number } | string | null;
        const errorMsg = (typeof detalle === "object" && detalle?.message) || (typeof detalle === "string" ? detalle : JSON.stringify(detalle)) || "";
        lastErrorMsg = errorMsg;
        const estado = typeof detalle === "object" ? detalle?.status : undefined;

        const isAuthError =
          estado === 400 ||
          estado === 401 ||
          estado === 403 ||
          errorMsg.includes("API key not valid") ||
          errorMsg.includes("API_KEY_INVALID") ||
          errorMsg.includes("PERMISSION_DENIED");
        if (isAuthError) {
          throw new GeminiConfigError(
            "La clave de Gemini configurada para esta tienda no es válida o no tiene permisos suficientes."
          );
        }

        const isNotFound = estado === 404 || errorMsg.includes("NOT_FOUND") || errorMsg.includes("not found");
        if (isNotFound) break; // probar siguiente modelo de la lista

        const isQuotaExhausted =
          estado === 429 &&
          (errorMsg.includes("Quota") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED"));
        if (isQuotaExhausted) break; // probar siguiente modelo

        const isTransient =
          estado === 503 ||
          estado === 429 ||
          errorMsg.includes("UNAVAILABLE") ||
          errorMsg.includes("high demand") ||
          errorMsg.includes("Resource has been exhausted");

        if (isTransient && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          break;
        }
      }
    }
  }

  throw new Error(`El servicio de Inteligencia Artificial no está disponible en este momento. Intenta de nuevo en unos minutos. (${lastErrorMsg || "alta demanda"})`);
}

export function buildChatContents(messages: Array<{ role: string; content?: string; text?: string }>) {
  const mapped = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content || m.text || "" }],
  }));

  let contents = mapped;
  while (contents.length > 0 && contents[0].role !== "user") {
    contents = contents.slice(1);
  }
  if (contents.length === 0) {
    contents = [{ role: "user", parts: [{ text: "Hola" }] }];
  }
  return contents;
}

/** Producto tal como llega del navegador (ya validado por zod; aquí solo se leen estos campos). */
interface ProductoContexto { name?: string; stock?: number | string; minStock?: number | string; price?: number | string; category?: string }
/** Venta tal como llega del navegador (solo los campos que se leen). */
interface VentaContexto {
  items?: Array<{ name?: string; quantity?: number | string; price?: number | string }>;
  timestamp?: string; total?: number | string; clientName?: string; paymentMethod?: string;
}

export function buildStoreContext(products: ProductoContexto[] = [], sales: VentaContexto[] = [], businessType?: string): string {
  let storeContext = "";

  if (businessType && businessType.trim()) {
    // Se limita y se aplana: es texto del cliente que entra al prompt.
    storeContext += `Tipo de negocio: ${businessType.replace(/\s+/g, " ").trim().slice(0, 60)}\n`;
  }

  if (Array.isArray(products) && products.length > 0) {
    storeContext += "\n--- INVENTARIO DE LA TIENDA ---\n";
    products.slice(0, 200).forEach((p) => {
      const minStk = p.minStock !== undefined ? p.minStock : 5;
      storeContext += `- ${p.name}: Stock actual: ${p.stock}, Stock mínimo sugerido: ${minStk}, Precio de venta: $${p.price}, Categoría: ${p.category || "General"}\n`;
    });
  } else {
    storeContext += "\nNo hay productos registrados en el inventario de esta tienda actualmente.\n";
  }

  if (Array.isArray(sales) && sales.length > 0) {
    storeContext += "\n--- HISTORIAL DE VENTAS RECIENTES ---\n";
    sales.slice(-15).forEach((s, idx) => {
      const itemsStr = s.items?.map((it) => `${it.name} (Cant: ${it.quantity}, Precio: $${it.price})`).join(", ") || "";
      const formattedDate = s.timestamp ? String(s.timestamp).substring(0, 10) : "N/A";
      storeContext += `- Venta #${idx + 1} (${formattedDate}): Total: $${s.total}, Cliente: ${s.clientName || "Consumidor Final"}, Productos: [${itemsStr}], Método de pago: ${s.paymentMethod || "Efectivo"}\n`;
    });
  } else {
    storeContext += "\nNo hay transacciones ni ventas registradas todavía.\n";
  }

  return storeContext;
}

export const CHAT_SYSTEM_INSTRUCTION_PREFIX =
  "Actúa como Tiendly AI, asesor de negocios de barrio en Latinoamérica (tiendas, panaderías, fruver, ferreterías, papelerías, droguerías y similares). " +
  "Responde en español, de forma MUY BREVE y directa (máximo 3-5 líneas o 3 viñetas). " +
  "Sé amigable pero conciso. Usa viñetas solo cuando sea estrictamente necesario para listar pasos o ítems. " +
  "Nunca escribas párrafos largos. Si la respuesta es simple, responde en 1-2 oraciones. " +
  "Tienes acceso a los datos reales de inventario y ventas de la tienda del usuario. " +
  "Si el usuario pregunta algo sobre sus datos, usa la información provista. " +
  "Si la tienda no tiene datos aún, indícalo en una sola frase.\n\n" +
  "Datos actuales de la tienda:\n";
