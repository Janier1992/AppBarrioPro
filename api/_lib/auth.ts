// ======================================================
// Archivo: api/_lib/auth.ts
// Responsabilidad: Verificar la sesión InsForge del llamante en endpoints server-side
// Módulo: Capa de Seguridad (Backend)
// Descripción: Usa @insforge/sdk/ssr para validar el Bearer token que el
//              frontend adjunta en cada llamada a /api/*, evitando que el
//              proxy de IA quede abierto a cualquier visitante anónimo.
// ======================================================

import { createServerClient } from "@insforge/sdk/ssr";
import insforgeConfig from "../../insforge-applet-config.json";

const INSFORGE_URL = process.env.VITE_INSFORGE_URL || insforgeConfig.baseUrl;
const INSFORGE_ANON_KEY = process.env.VITE_INSFORGE_ANON_KEY || insforgeConfig.anonKey;

export interface AuthenticatedRequester {
  userId: string;
  email?: string;
}

function extractBearerToken(req: { headers: Record<string, string | string[] | undefined> }): string | null {
  const raw = req.headers.authorization || (req.headers as any).Authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Valida el token de sesión de InsForge del request contra el propio backend
 * de InsForge (no confía en ningún userId que venga en el body).
 * Devuelve null si no hay token o si InsForge lo rechaza.
 */
export async function authenticateRequest(req: {
  headers: Record<string, string | string[] | undefined>;
}): Promise<AuthenticatedRequester | null> {
  const token = extractBearerToken(req);
  if (!token) return null;
  if (!INSFORGE_URL || !INSFORGE_ANON_KEY) return null;

  try {
    const client = createServerClient({
      baseUrl: String(INSFORGE_URL).replace(/\/+$/, ""),
      anonKey: String(INSFORGE_ANON_KEY),
      accessToken: token,
    });

    const { data, error } = await client.auth.getCurrentUser();
    if (error || !data?.user) return null;

    return { userId: data.user.id, email: data.user.email };
  } catch {
    return null;
  }
}
