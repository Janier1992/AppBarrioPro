// ======================================================
// Archivo: api/chat.ts
// Responsabilidad: Endpoint serverless de Vercel para el chat de Tiendly AI.
// Seguridad: requiere una sesión válida de InsForge (Bearer token) y aplica
//            un límite de tasa por usuario antes de invocar a Gemini.
// La lógica de negocio vive en _lib/chatHandler.ts (compartida con server.ts).
// ======================================================

import { isIpRateLimited } from "./_lib/rateLimit.js";
import { authenticateRequest } from "./_lib/auth.js";
import { processChatRequest, SUBSCRIPTION_REQUIRED_RESPONSE, UNAUTHENTICATED_RESPONSE } from "./_lib/chatHandler.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (await isIpRateLimited(req)) {
    return res.status(429).json({ error: "Demasiadas solicitudes. Espera un momento." });
  }

  const requester = await authenticateRequest(req);
  if (!requester) {
    return res.status(UNAUTHENTICATED_RESPONSE.status).json(UNAUTHENTICATED_RESPONSE.body);
  }

  // La prueba terminó o el mes venció: el asistente (que consume la cuota de Gemini) también se bloquea.
  if (requester.subscriptionActive === false) {
    return res.status(SUBSCRIPTION_REQUIRED_RESPONSE.status).json(SUBSCRIPTION_REQUIRED_RESPONSE.body);
  }

  const result = await processChatRequest(requester.userId, req.body);
  return res.status(result.status).json(result.body);
}
