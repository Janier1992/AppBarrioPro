// ======================================================
// Archivo: api/_lib/auth.ts
// Responsabilidad: Verificar la sesión InsForge del llamante en endpoints server-side
// Módulo: Capa de Seguridad (Backend)
// Descripción: Usa @insforge/sdk/ssr para validar el Bearer token que el
//              frontend adjunta en cada llamada a /api/*, evitando que el
//              proxy de IA quede abierto a cualquier visitante anónimo.
// ======================================================

import { createServerClient } from "@insforge/sdk/ssr";
import { INSFORGE_DEFAULT_ANON_KEY, INSFORGE_DEFAULT_BASE_URL } from "./publicConfig.js";

const INSFORGE_URL = process.env.VITE_INSFORGE_URL || INSFORGE_DEFAULT_BASE_URL;
const INSFORGE_ANON_KEY = process.env.VITE_INSFORGE_ANON_KEY || INSFORGE_DEFAULT_ANON_KEY;

export interface AuthenticatedRequester {
  userId: string;
  email?: string;
  /**
   * ¿Tiene la suscripción (o prueba de 7 días) vigente? true/false según la base de datos; null si no se pudo
   * saber (falla de red o migración sin aplicar): en ese caso no se bloquea, para no dejar sin servicio a todos.
   */
  subscriptionActive: boolean | null;
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

    let subscriptionActive: boolean | null = null;
    try {
      const { data: sub, error: subError } = await (client as any).database.rpc("my_subscription");
      if (!subError && sub && typeof sub.hasAccess === "boolean") subscriptionActive = sub.hasAccess || sub.isAdmin === true;
    } catch {
      /* sin dato: no se bloquea */
    }

    return { userId: data.user.id, email: data.user.email, subscriptionActive };
  } catch {
    return null;
  }
}
