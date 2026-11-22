/** La auditoría RLS (solo lectura) debe dar todo ✔ con la configuración correcta y detectar cada hueco que se le provoque. */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const AUDIT = read("insforge-auditoria-rls.sql");
let db: PGlite;

beforeEach(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, public TO authenticated;`);
  await db.exec(read("insforge-schema.sql").replace(/CREATE EXTENSION[^;]*;/g, ""));
  await db.exec(read("insforge-rls-policies.sql"));
  await db.exec(read("insforge-migration-stock-atomico.sql"));
  await db.exec(read("insforge-migration-suscripciones.sql"));
  await db.exec(read("insforge-migration-soporte.sql"));
});

const audit = async () => (await db.query(AUDIT)).rows as Array<{ n: number; verificacion: string; estado: string; detalle: string }>;
const failed = async () => (await audit()).filter((r) => r.estado === "✘");

describe("auditoría RLS (solo lectura)", () => {
  it("con la configuración correcta: las 9 verificaciones dan ✔", async () => {
    const rows = await audit();
    expect(rows).toHaveLength(9);
    expect(rows.filter((r) => r.estado !== "✔")).toEqual([]);
  });

  it("no modifica nada (puede correr cuantas veces quieras)", async () => {
    const before = (await db.query("SELECT count(*)::int n FROM pg_policies")).rows[0] as any;
    await audit(); await audit();
    expect(((await db.query("SELECT count(*)::int n FROM pg_policies")).rows[0] as any).n).toBe(before.n);
  });

  it("detecta RLS apagado", async () => {
    await db.exec("ALTER TABLE sales DISABLE ROW LEVEL SECURITY");
    const f = await failed();
    expect(f.map((r) => r.n)).toContain(1);
    expect(f.find((r) => r.n === 1)!.detalle).toContain("sales");
  });

  it("detecta una política abierta a todos", async () => {
    await db.exec("CREATE POLICY abierta ON products FOR SELECT USING (true)");
    expect((await failed()).map((r) => r.n)).toContain(2);
  });

  it("detecta una política que no está ligada al usuario", async () => {
    await db.exec(`DROP POLICY debts_select_own ON debts; CREATE POLICY debts_select_own ON debts FOR SELECT USING ("clientName" IS NOT NULL)`);
    const f = await failed();
    expect(f.map((r) => r.n)).toContain(3);
    expect(f.find((r) => r.n === 3)!.detalle).toContain("debts");
  });

  it("detecta una operación sin cubrir", async () => {
    await db.exec("DROP POLICY tasks_delete_own ON tasks");
    const f = await failed();
    expect(f.find((r) => r.n === 4)!.detalle).toContain("tasks:DELETE");
  });

  it("detecta que falta el bloqueo por suscripción", async () => {
    await db.exec("DROP POLICY sales_require_access ON sales");
    const f = await failed();
    expect(f.find((r) => r.n === 5)!.detalle).toContain("sales");
  });

  it("detecta si un cliente pudiera escribir su suscripción", async () => {
    await db.exec(`CREATE POLICY hack ON subscriptions FOR UPDATE USING (true) WITH CHECK (true)`);
    const f = await failed();
    expect(f.map((r) => r.n)).toContain(6);
    expect(f.find((r) => r.n === 6)!.detalle).toContain("subscriptions.hack");
  });

  it("detecta una bitácora legible por clientes", async () => {
    await db.exec(`CREATE POLICY ver ON admin_audit FOR SELECT USING (true)`);
    expect((await failed()).map((r) => r.n)).toContain(7);
  });

  it("detecta un respaldo abierto, y acepta uno cerrado", async () => {
    await db.exec(`CREATE TABLE respaldo_profile AS SELECT * FROM profile`);
    expect((await failed()).map((r) => r.n)).toContain(8);
    await db.exec(`ALTER TABLE respaldo_profile ENABLE ROW LEVEL SECURITY`);
    expect((await failed()).map((r) => r.n)).not.toContain(8);
  });

  it("cubre las tablas de tickets: detecta RLS apagado y escritura directa de clientes", async () => {
    await db.exec("ALTER TABLE support_tickets DISABLE ROW LEVEL SECURITY");
    expect((await failed()).find((r) => r.n === 1)!.detalle).toContain("support_tickets");
    await db.exec("ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY");
    await db.exec(`CREATE POLICY hack ON support_messages FOR INSERT WITH CHECK (true)`);
    expect((await failed()).find((r) => r.n === 6)!.detalle).toContain("support_messages.hack");
  });

  it("detecta una función de tickets insegura (sin SECURITY DEFINER)", async () => {
    await db.exec(`ALTER FUNCTION admin_support_reply(BIGINT, TEXT, TEXT) SECURITY INVOKER`);
    expect((await failed()).find((r) => r.n === 9)!.detalle).toContain("admin_support_reply");
  });

  it("detecta una función de soporte insegura (sin SECURITY DEFINER)", async () => {
    await db.exec(`ALTER FUNCTION admin_clear_pin(TEXT) SECURITY INVOKER`);
    const f = await failed();
    expect(f.find((r) => r.n === 9)!.detalle).toContain("admin_clear_pin");
  });
});
