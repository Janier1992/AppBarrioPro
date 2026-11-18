// ======================================================
// Archivo: scripts/check-api-esm.mjs
// Responsabilidad: Comprobar que las funciones serverless de api/ CARGAN en Node ESM
//   (como en Vercel con "type": "module"): imports con extensión, sin importar .json, etc.
// Por qué existe: un import sin extensión tumbó /api/chat en producción (HTTP 500) y
//   ni el type-check ni vitest lo detectan, porque ambos resuelven módulos de forma laxa.
// Uso: npm run check:api
// ======================================================
import { build } from "esbuild";
import { mkdtemp, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readdirSync } from "node:fs";

const root = resolve(import.meta.dirname, "..");
const out = await mkdtemp(join(tmpdir(), "api-esm-"));

try {
  const entries = [join(root, "api/chat.ts")];
  for (const f of readdirSync(join(root, "api/_lib"))) {
    if (f.endsWith(".ts") && !f.endsWith(".test.ts")) entries.push(join(root, "api/_lib", f));
  }
  // Sin bundle: replica el comportamiento de un runtime que ejecuta cada archivo como módulo ESM.
  await build({ entryPoints: entries, outdir: join(out, "api"), outbase: join(root, "api"), format: "esm", platform: "node", logLevel: "error" });
  await writeFile(join(out, "package.json"), JSON.stringify({ type: "module" }));
  await symlink(join(root, "node_modules"), join(out, "node_modules"), "dir");

  const mod = await import(pathToFileURL(join(out, "api/chat.js")).href);
  const res = { code: 0, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  await mod.default({ method: "POST", headers: {}, body: {} }, res);

  if (res.code !== 401) throw new Error(`Se esperaba 401 sin sesión y se obtuvo ${res.code}`);
  console.log("OK: api/chat carga como ESM y responde 401 sin sesión.");
} catch (error) {
  console.error("FALLO: api/ no carga como módulo ESM (Vercel devolvería HTTP 500):\n", error);
  process.exitCode = 1;
} finally {
  await rm(out, { recursive: true, force: true });
}
