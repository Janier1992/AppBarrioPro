// ======================================================
// Archivo: api/chat.ts
// Responsabilidad: Endpoint serverless de Vercel para el chat de Tiendly AI.
// Seguridad: requiere una sesión válida de InsForge (Bearer token) y aplica
//            un límite de tasa por usuario antes de invocar a Gemini.
// La lógica de negocio vive en _lib/chatHandler.ts (compartida con server.ts).
// ======================================================

import { authenticateRequest } from "./_lib/auth";
import { processChatRequest, UNAUTHENTICATED_RESPONSE } from "./_lib/chatHandler";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const requester = await authenticateRequest(req);
  if (!requester) {
    return res.status(UNAUTHENTICATED_RESPONSE.status).json(UNAUTHENTICATED_RESPONSE.body);
  }

  const result = await processChatRequest(requester.userId, req.body);
  return res.status(result.status).json(result.body);
}
