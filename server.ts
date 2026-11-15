import express from "express";
import path from "path";
import helmet from "helmet";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { authenticateRequest } from "./api/_lib/auth";
import { buildCspDirectives } from "./api/_lib/csp";
import { processChatRequest, UNAUTHENTICATED_RESPONSE } from "./api/_lib/chatHandler";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// La CSP estricta por defecto de Helmet bloquea scripts inline sin nonce.
// En dev, Vite (modo middleware) inyecta su propio bootstrap de Fast Refresh
// como <script> inline, así que ahí se desactiva (igual que el propio
// dev server de Vite, que tampoco envía CSP). En producción se aplica una CSP
// propia (api/_lib/csp.ts) que permite los orígenes externos que la app necesita
// (InsForge, Sentry); la CSP por defecto de Helmet los bloquearía.
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === "production" ? { directives: buildCspDirectives() } : false,
  })
);
app.use(express.json({ limit: "2mb" }));

// Health check para balanceadores, orquestadores y el HEALTHCHECK del Dockerfile.
app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Requiere una sesión válida de InsForge (Bearer token) para cualquier ruta de IA.
// Sin esto, el proxy de Gemini queda abierto a cualquier visitante de la URL pública.
// La lógica del chat se comparte con api/chat.ts (Vercel) vía api/_lib/chatHandler.ts.
app.post("/api/chat", async (req, res) => {
  const requester = await authenticateRequest(req);
  if (!requester) {
    return res.status(UNAUTHENTICATED_RESPONSE.status).json(UNAUTHENTICATED_RESPONSE.body);
  }
  const result = await processChatRequest(requester.userId, req.body);
  res.status(result.status).json(result.body);
});

// Nota: los endpoints /api/recommendations/* y /api/grounding/maps definidos en
// versiones previas de este archivo no tenían ningún llamador en el frontend
// (verificado en src/) y nunca se desplegaron como función de Vercel — se
// retiraron para no mantener superficie de ataque sin uso real. Si se
// reactivan, deben implementarse siguiendo el mismo patrón de /api/chat.ts
// (auth + rate limit + validación) tanto aquí como en /api/*.ts.

// Cualquier ruta /api/* no definida devuelve JSON 404 (no el index.html del SPA).
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

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

  // Errores no controlados (p. ej. JSON malformado en el body): respuesta JSON sin filtrar trazas.
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err?.status && err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) console.error("[server] error no controlado:", err?.message || err);
    res.status(status).json({ error: status === 500 ? "Error interno del servidor." : "Solicitud inválida." });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BarrioPro Server] running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("[BarrioPro Server] no se pudo iniciar:", error);
  process.exit(1);
});
