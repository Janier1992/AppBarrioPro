/** Prueba del script insforge-prueba-rls.sql contra Postgres real, incluyendo controles negativos: debe DETECTAR un RLS roto. */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const SCRIPT = read("insforge-prueba-rls.sql");
const A = "11111111-0000-0000-0000-000000000001";
let db: PGlite;

async function setup() {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, public TO authenticated;`);
  await db.exec(read("insforge-schema.sql").replace(/CREATE EXTENSION[^;]*;/g, ""));
  await db.exec(read("insforge-rls-policies.sql"));
  await db.exec(read("insforge-migration-stock-atomico.sql"));
  await db.exec(read("insforge-migration-suscripciones.sql"));
  await db.exec("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated");
  await db.exec(`INSERT INTO auth.users VALUES ('${A}', 'isacarmen2@gmail.com')`);
}
const run = async () => { try { await db.exec(SCRIPT); return "SIN INFORME"; } catch (e: any) { return String(e.message); } };
const rowsLeft = async (t: string) => Number(((await db.query(`SELECT count(*) n FROM ${t}`)).rows[0] as any).n);

describe("prueba de aislamiento RLS", () => {
  beforeEach(setup);

  it("con las políticas correctas: todas las pruebas pasan, y no deja NINGÚN dato (todo se deshace)", async () => {
    const report = await run();
    expect(report).toContain("RESULTADO: TODAS LAS PRUEBAS PASARON");
    expect(report).not.toContain("✘");
    expect(report).toContain("✔ products: B lee filas de A -> 0");
    expect(report).toContain("✔ products: B ve sus propios datos -> 1");
    for (const t of ["products", "sales", "tasks", "debts", "subscriptions"]) expect(await rowsLeft(t), t).toBe(0);
  });

  it("DETECTA un hueco: si se quita la política de lectura propia de productos y se abre a todos", async () => {
    await db.exec(`DROP POLICY products_select_own ON products; CREATE POLICY products_select_all ON products FOR SELECT USING (true);`);
    const report = await run();
    expect(report).toContain("✘ products: B lee filas de A");
    expect(report).toMatch(/PRUEBA\(S\) FALLARON/);
  });

  it("DETECTA un hueco: si RLS está apagado en ventas", async () => {
    await db.exec(`ALTER TABLE sales DISABLE ROW LEVEL SECURITY;`);
    const report = await run();
    expect(report).toContain("✘ sales:");
    expect(report).toMatch(/FALLARON/);
  });

  it("DETECTA un hueco: si se permite crear datos a nombre de otro", async () => {
    await db.exec(`DROP POLICY products_insert_own ON products; CREATE POLICY products_insert_any ON products FOR INSERT WITH CHECK (true);`);
    const report = await run();
    expect(report).toContain("✘ products: B CREÓ un producto a nombre de A");
  });

  it("DETECTA un hueco: si el cliente puede alargarse su propia suscripción", async () => {
    await db.exec(`CREATE POLICY subs_hack ON subscriptions FOR UPDATE USING (true) WITH CHECK (true);`);
    const report = await run();
    expect(report).toContain("✘ subscriptions: B se alarga su propia prueba");
  });

  it("no da un 'falso aprobado': si la sesión simulada no funciona, lo dice", async () => {
    await db.exec(`CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT '99999999-0000-0000-0000-000000000009'::uuid $$;`);
    const report = await run();
    expect(report).toContain("No se pudo simular la sesión de B");
    expect(report).not.toContain("TODAS LAS PRUEBAS PASARON");
  });

  it("se niega si la cuenta víctima no existe", async () => {
    await db.exec(`DELETE FROM auth.users`);
    expect(await run()).toContain("No encontré isacarmen2@gmail.com");
  });
});
