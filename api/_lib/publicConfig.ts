// ======================================================
// Archivo: api/_lib/publicConfig.ts
// Responsabilidad: Valores PÚBLICOS por defecto de InsForge para el backend (/api).
// Por qué existe: importar un .json desde una función serverless ESM falla en Node
//   sin atributos de importación, lo que tumbaba /api/chat al cargarse (HTTP 500).
//   Una constante TypeScript carga siempre. La baseUrl y la anonKey son públicas por
//   diseño (viajan en el bundle del navegador). Una prueba (publicConfig.test.ts)
//   garantiza que no diverjan de insforge-applet-config.json, que usa el frontend.
// ======================================================

export const INSFORGE_DEFAULT_BASE_URL = "https://4pjv8sxs.us-east.insforge.app";
export const INSFORGE_DEFAULT_ANON_KEY = "ik_979467316d6288d071cd67eca439484c";
