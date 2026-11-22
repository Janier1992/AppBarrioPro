/**
 * Prueba del script de limpieza de cuentas contra un Postgres real (PGlite): conserva solo la cuenta indicada y
 * la de soporte, respalda lo borrado y se niega a borrar si no encuentra la cuenta a conservar.
 */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const SQL = read("insforge-script-limpiar-cuentas.sql");
const DO_BLOCK = SQL.slice(SQL.indexOf("DO $$"), SQL.indexOf("$$;", SQL.indexOf("DO $$")) + 3);
const PREVIEW = SQL.slice(SQL.indexOf("SELECT p.\"userId\", p.email, p.\"businessName\","), SQL.indexOf("ORDER BY p.email, p.\"businessName\";") + "ORDER BY p.email, p.\"businessName\";".length);

const KEEP = "11111111-0000-0000-0000-000000000001";
const OLD_DUP = "22222222-0000-0000-0000-000000000002"; // otro perfil con el MISMO correo (huérfano)
const OTHER = "33333333-0000-0000-0000-000000000003";
const ADMIN = "44444444-0000-0000-0000-000000000004";
let db: PGlite;

async function seed(withAuthUser = true) {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;`);
  await db.exec(read("insforge-schema.sql").replace(/CREATE EXTENSION[^;]*;/g, ""));
  await db.exec(read("insforge-rls-policies.sql"));
  await db.exec(read("insforge-migration-stock-atomico.sql"));
  await db.exec(read("insforge-migration-suscripciones.sql"));
  if (withAuthUser) await db.exec(`INSERT INTO auth.users VALUES ('${KEEP}', 'Isacarmen2@Gmail.com')`);
  await db.exec(`INSERT INTO admins ("userId", email) VALUES ('${ADMIN}', 'soporte@x.co')`);
  for (const [uid, name, email] of [[KEEP, "Mi Negocio", "isacarmen2@gmail.com"], [OLD_DUP, "Mi Negocio", "isacarmen2@gmail.com"], [OTHER, "Granero la 30", "otro@gmail.com"], [ADMIN, "Soporte", "soporte@x.co"]]) {
    await db.exec(`INSERT INTO profile (id, "userId", "businessName", email) VALUES ('p_${uid}', '${uid}', '${name}', '${email}');
      INSERT INTO subscriptions ("userId", "trialEndsAt") VALUES ('${uid}', now() + interval '3 days') ON CONFLICT DO NOTHING;
      INSERT INTO products (id, "userId", name, stock, "minStock") VALUES ('prod_${uid}', '${uid}', 'Arroz', 5, 2);
      INSERT INTO sales (id, "userId", total) VALUES ('sale_${uid}', '${uid}', 100);`);
  }
}
const count = async (sql: string) => Number(((await db.query(sql)).rows[0] as any).n);

describe("script de limpieza de cuentas", () => {
  beforeEach(() => seed());

  it("la vista previa lista solo lo que se borraría (incluido el perfil repetido del mismo correo) y no cambia nada", async () => {
    const rows = (await db.query(PREVIEW)).rows as any[];
    expect(rows.map((r) => r.userId).sort()).toEqual([OLD_DUP, OTHER].sort());
    expect(Number(rows.find((r) => r.userId === OTHER).productos)).toBe(1);
    expect(await count("SELECT count(*) n FROM profile")).toBe(4);
  });

  it("conserva solo la cuenta indicada (por su id) y la de soporte; borra el resto con sus datos", async () => {
    await db.exec(DO_BLOCK);
    const left = ((await db.query(`SELECT "userId" FROM profile`)).rows as any[]).map((r) => r.userId).sort();
    expect(left).toEqual([KEEP, ADMIN].sort());
    expect(await count(`SELECT count(*) n FROM products WHERE "userId" IN ('${OTHER}', '${OLD_DUP}')`)).toBe(0);
    expect(await count(`SELECT count(*) n FROM sales WHERE "userId" IN ('${OTHER}', '${OLD_DUP}')`)).toBe(0);
    expect(await count(`SELECT count(*) n FROM subscriptions WHERE "userId" IN ('${OTHER}', '${OLD_DUP}')`)).toBe(0);
    // Lo conservado sigue intacto
    expect(await count(`SELECT count(*) n FROM products WHERE "userId" = '${KEEP}'`)).toBe(1);
    expect(await count(`SELECT count(*) n FROM subscriptions WHERE "userId" = '${KEEP}'`)).toBe(1);
  });

  it("deja un respaldo de lo borrado, cerrado con RLS", async () => {
    await db.exec(DO_BLOCK);
    expect(await count("SELECT count(*) n FROM respaldo_profile")).toBe(2);
    expect(await count("SELECT count(*) n FROM respaldo_products")).toBe(2);
    expect(await count("SELECT count(*) n FROM respaldo_sales")).toBe(2);
    const rls = (await db.query(`SELECT relrowsecurity FROM pg_class WHERE relname = 'respaldo_profile'`)).rows[0] as any;
    expect(rls.relrowsecurity).toBe(true);
    // Un cliente conectado no puede leer el respaldo
    await db.exec(`GRANT SELECT ON respaldo_profile TO authenticated; SET ROLE authenticated`);
    expect(((await db.query("SELECT * FROM respaldo_profile")).rows as any[]).length).toBe(0);
  });

  it("es repetible sin errores", async () => {
    await db.exec(DO_BLOCK);
    await expect(db.exec(DO_BLOCK)).resolves.not.toThrow();
    expect(await count("SELECT count(*) n FROM profile")).toBe(2);
  });
});

describe("protección: si no encuentra la cuenta a conservar, no borra NADA", () => {
  it("se niega y deja todo intacto", async () => {
    await seed(false); // sin la cuenta en auth.users
    await expect(db.exec(DO_BLOCK)).rejects.toThrow(/No se encontró .* no se borra nada/);
    expect(await count("SELECT count(*) n FROM profile")).toBe(4);
    expect(await count("SELECT count(*) n FROM products")).toBe(4);
  });
});
