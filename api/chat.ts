// ======================================================
// Archivo: api/chat.ts
// Responsabilidad: Endpoint serverless de Vercel para el chat de BarrioPro AI.
// Seguridad: requiere una sesión válida de InsForge (Bearer token) y aplica
//            un límite de tasa por usuario antes de invocar a Gemini.
// ======================================================

import { authenticateRequest } from "./_lib/auth";
import { isRateLimited } from "./_lib/rateLimit";
import { chatRequestSchema } from "./_lib/validation";
import {
  buildChatContents,
  buildStoreContext,
  CHAT_SYSTEM_INSTRUCTION_PREFIX,
  generateContentWithRetry,
  GeminiConfigError,
} from "./_lib/gemini";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const requester = await authenticateRequest(req);
  if (!requester) {
    return res.status(401).json({ error: "Debes iniciar sesión para usar el asistente de IA." });
  }

  if (isRateLimited(`chat:${requester.userId}`, 20, 60_000)) {
    return res.status(429).json({ error: "Has enviado demasiados mensajes. Espera un momento antes de continuar." });
  }

  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "La solicitud no tiene un formato válido." });
  }
  const { messages, products, sales, geminiApiKey } = parsed.data;

  try {
    const contents = buildChatContents(messages);
    const systemInstruction = CHAT_SYSTEM_INSTRUCTION_PREFIX + buildStoreContext(products, sales);

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents,
      config: { systemInstruction },
      apiKey: geminiApiKey,
    });

    return res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error(`[chat] userId=${requester.userId} error:`, error?.message || error);
    const status = error instanceof GeminiConfigError ? 400 : 500;
    return res.status(status).json({ error: error.message || "Error al procesar el chat con el asistente de IA." });
  }
}
