// ======================================================
// Archivo: api/_lib/chatHandler.ts
// Responsabilidad: Lógica única del endpoint de chat de IA (rate limit, validación
//                  y llamada a Gemini), independiente del framework HTTP.
// Por qué existe: antes estaba duplicada en server.ts (Express, dev/contenedor) y
//                 api/chat.ts (Vercel); cualquier ajuste debía hacerse en dos sitios.
// La autenticación se resuelve en cada adaptador (necesita el objeto request).
// ======================================================

import { checkRateLimit } from "./rateLimit.js";
import { chatRequestSchema } from "./validation.js";
import {
  buildChatContents,
  buildStoreContext,
  CHAT_SYSTEM_INSTRUCTION_PREFIX,
  generateContentWithRetry,
  GeminiConfigError,
} from "./gemini.js";

const CHAT_MODEL = "gemini-2.5-flash";
export const UNAUTHENTICATED_RESPONSE = {
  status: 401,
  body: { error: "Debes iniciar sesión para usar el asistente de IA." },
} as const;

export const SUBSCRIPTION_REQUIRED_RESPONSE = {
  status: 402,
  body: { error: "Tu suscripción no está activa. Actívala para usar el asistente de IA." },
} as const;

export interface ChatResult {
  status: number;
  body: { text?: string; error?: string };
}

/** Procesa una petición de chat de un usuario ya autenticado. */
export async function processChatRequest(userId: string, rawBody: unknown): Promise<ChatResult> {
  if (await checkRateLimit(`chat:${userId}`, 20, 60_000)) {
    return { status: 429, body: { error: "Has enviado demasiados mensajes. Espera un momento antes de continuar." } };
  }

  const parsed = chatRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return { status: 400, body: { error: "La solicitud no tiene un formato válido." } };
  }
  const { messages, products, sales, businessType } = parsed.data;

  try {
    const response = await generateContentWithRetry({
      model: CHAT_MODEL,
      contents: buildChatContents(messages),
      config: { systemInstruction: CHAT_SYSTEM_INSTRUCTION_PREFIX + buildStoreContext(products, sales, businessType) },
    });
    return { status: 200, body: { text: response.text } };
  } catch (error: any) {
    console.error(`[chat] userId=${userId} error:`, error?.message || error);
    const status = error instanceof GeminiConfigError ? 400 : 500;
    return { status, body: { error: error?.message || "Error al procesar el chat con el asistente de IA." } };
  }
}
