import express from "express";
import path from "path";
import helmet from "helmet";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { authenticateRequest } from "./api/_lib/auth";
import { isRateLimited } from "./api/_lib/rateLimit";
import { chatRequestSchema } from "./api/_lib/validation";
import {
  buildChatContents,
  buildStoreContext,
  CHAT_SYSTEM_INSTRUCTION_PREFIX,
  generateContentWithRetry,
  GeminiConfigError,
} from "./api/_lib/gemini";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// La CSP estricta por defecto de Helmet bloquea scripts inline sin nonce.
// En dev, Vite (modo middleware) inyecta su propio bootstrap de Fast Refresh
// como <script> inline, así que ahí se desactiva (igual que el propio
// dev server de Vite, que tampoco envía CSP). En producción queda activa.
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
  })
);
app.use(express.json({ limit: "2mb" }));

// Requiere una sesión válida de InsForge (Bearer token) para cualquier ruta de IA.
// Sin esto, el proxy de Gemini queda abierto a cualquier visitante de la URL pública.
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const requester = await authenticateRequest(req as any);
  if (!requester) {
    return res.status(401).json({ error: "Debes iniciar sesión para usar el asistente de IA." });
  }
  (req as any).requester = requester;
  next();
}

app.post("/api/chat", requireAuth, async (req, res) => {
  const requester = (req as any).requester as { userId: string };

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

    res.json({ text: response.text });
  } catch (error: any) {
    console.error(`[chat] userId=${requester.userId} error:`, error?.message || error);
    const status = error instanceof GeminiConfigError ? 400 : 500;
    res.status(status).json({ error: error.message || "Error al procesar el chat con el asistente de IA." });
  }
});

// Nota: los endpoints /api/recommendations/* y /api/grounding/maps definidos en
// versiones previas de este archivo no tenían ningún llamador en el frontend
// (verificado en src/) y nunca se desplegaron como función de Vercel — se
// retiraron para no mantener superficie de ataque sin uso real. Si se
// reactivan, deben implementarse siguiendo el mismo patrón de /api/chat.ts
// (auth + rate limit + validación) tanto aquí como en /api/*.ts.

// Setup Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BarrioPro Server] running on http://localhost:${PORT}`);
  });
}

startServer();
