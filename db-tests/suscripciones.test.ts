/**
 * Pruebas del control de suscripciones CONTRA UN POSTGRES REAL (PGlite, en memoria).
 * Se cargan los mismos archivos SQL que se aplican en InsForge: esquema, RLS, stock atómico y suscripciones.
 * Así se prueba de verdad que la base rechaza el acceso cuando vence la prueba o el mes.
 */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

const ADMIN = "aaaaaaaa-0000-0000-0000-000000000001";
const ANA = "bbbbbbbb-0000-0000-0000-000000000002";
const LUIS = "cccccccc-0000-0000-0000-000000000003";

let db: PGlite;

/** Ejecuta como el usuario (rol "authenticated" con su id), igual que InsForge. */
async function as<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`);
  try {
    return await fn();
  } finally {
    await db.exec("RESET ROLE");
  }
}
const rows = async (sql: string, params: unknown[] = []) => (await db.query(sql, params)).rows as any[];
const sub = (uid: string) => as(uid, async () => (await rows("SELECT my_subscription() AS s"))[0].s);
const setSub = (uid: string, sql: string) => db.exec(`UPDATE subscriptions SET ${sql} WHERE "userId" = '${uid}'`);
const addProduct = (uid: string, id: string) =>
  as(uid, () => db.query(`INSERT INTO products (id, "userId", name, stock, "minStock") VALUES ('${id}', '${uid}', 'Arroz', 10, 5)`));
const myProducts = (uid: string) => as(uid, () => rows("SELECT id FROM products"));

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, public TO authenticated;
  `);
  await db.exec(read("insforge-schema.sql").replace(/CREATE EXTENSION[^;]*;/g, ""));
  await db.exec(read("insforge-rls-policies.sql"));
  await db.exec(read("insforge-migration-stock-atomico.sql"));
  await db.exec(read("insforge-migration-suscripciones.sql"));
  // InsForge concede permisos de tabla a "authenticated"; lo que cierra el paso es RLS.
  await db.exec("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated; GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated");
  await db.exec(`INSERT INTO admins ("userId", email) VALUES ('${ADMIN}', 'soporte@tiendly.co')`);
  await db.exec(`INSERT INTO profile (id, "userId", "businessName", email) VALUES ('prof_admin', '${ADMIN}', 'Cuenta de soporte', 'soporte@tiendly.co')`);
  // Negocios de ejemplo con su perfil
  for (const [uid, name] of [[ANA, "Tienda de Ana"], [LUIS, "Panadería de Luis"]]) {
    await db.exec(`INSERT INTO profile (id, "userId", "businessName", email) VALUES ('prof_${uid}', '${uid}', '${name}', '${name.split(" ").pop()}@correo.com')`);
  }
});
afterAll(async () => db.close());

describe("prueba gratis de 7 días", () => {
  it("el primer ingreso crea la prueba con 7 días y no se reinicia al volver a entrar", async () => {
    const first = await as(ANA, async () => (await rows("SELECT ensure_subscription() AS s"))[0].s);
    expect(first).toMatchObject({ state: "trial", hasAccess: true, daysLeft: 7 });
    await setSub(ANA, `"trialEndsAt" = now() + interval '3 days'`);
    const again = await as(ANA, async () => (await rows("SELECT ensure_subscription() AS s"))[0].s);
    expect(again.daysLeft).toBe(3); // no volvió a 7
    await setSub(ANA, `"trialEndsAt" = now() + interval '7 days'`);
  });

  it("durante la prueba el cliente trabaja normal y solo ve lo suyo", async () => {
    await as(LUIS, () => db.query("SELECT ensure_subscription()"));
    await addProduct(ANA, "p-ana");
    await addProduct(LUIS, "p-luis");
    expect((await myProducts(ANA)).map((r) => r.id)).toEqual(["p-ana"]);
    expect((await myProducts(LUIS)).map((r) => r.id)).toEqual(["p-luis"]);
  });

  it("al terminar la prueba la BASE DE DATOS bloquea leer y escribir, sin importar lo que haga el cliente", async () => {
    await setSub(ANA, `"trialEndsAt" = now() - interval '1 second'`);
    expect((await sub(ANA))).toMatchObject({ state: "trial_expired", hasAccess: false });
    expect(await myProducts(ANA)).toEqual([]); // su producto existe, pero ya no puede leerlo
    await expect(addProduct(ANA, "p-ana-2")).rejects.toThrow(/row-level security|policy/i);
    await expect(as(ANA, () => db.query(`UPDATE products SET stock = 999 WHERE id = 'p-ana'`))).resolves.toMatchObject({ affectedRows: 0 });
    await expect(as(ANA, () => db.query(`INSERT INTO sales (id, "userId", total) VALUES ('s1', '${ANA}', 10)`))).rejects.toThrow(/row-level security|policy/i);
    // El otro cliente no se ve afectado
    expect((await myProducts(LUIS)).map((r) => r.id)).toEqual(["p-luis"]);
  });

  it("aun bloqueado puede leer su perfil y su estado (para mostrar la pantalla de activar suscripción)", async () => {
    expect((await as(ANA, () => rows(`SELECT "businessName" FROM profile`)))[0].businessName).toBe("Tienda de Ana");
  });

  it("el stock atómico también queda bloqueado", async () => {
    await expect(as(ANA, () => db.query(`SELECT adjust_stock('op-x', 'p-ana', -1)`))).rejects.toThrow();
  });
});

describe("el cliente no puede darse acceso a sí mismo", () => {
  it("no puede modificar ni crear su suscripción", async () => {
    await as(ANA, () => db.query(`UPDATE subscriptions SET "trialEndsAt" = now() + interval '5 years', status = 'active'`));
    expect((await sub(ANA)).hasAccess).toBe(false);
    await expect(as(ANA, () => db.query(`INSERT INTO subscriptions ("userId", "trialEndsAt") VALUES ('${ANA}', now())`))).rejects.toThrow();
    await expect(as(ANA, () => db.query(`INSERT INTO admins ("userId") VALUES ('${ANA}')`))).rejects.toThrow();
    expect((await sub(ANA)).isAdmin).toBe(false);
  });
  it("no puede llamar las funciones de soporte", async () => {
    for (const q of [`SELECT admin_list_accounts()`, `SELECT admin_register_payment('${ANA}', 29900, 'efectivo', 'x', 1)`,
      `SELECT admin_set_status('${ANA}', 'resume')`, `SELECT admin_extend_trial('${ANA}', 30)`, `SELECT admin_clear_pin('${LUIS}')`,
      `SELECT admin_account_summary('${LUIS}')`, `SELECT admin_audit_log(10)`]) {
      await expect(as(ANA, () => db.query(q)), q).rejects.toThrow(/Acceso solo para soporte|permission/i);
    }
  });
  it("no puede consultar el estado de otra cuenta", async () => {
    await expect(as(ANA, () => db.query(`SELECT subscription_state('${LUIS}')`))).rejects.toThrow(/permission/i);
  });
  it("una sesión sin iniciar no tiene acceso a nada", async () => {
    expect(await as(null, () => rows("SELECT id FROM products"))).toEqual([]);
    await expect(as(null, () => db.query("SELECT ensure_subscription()"))).rejects.toThrow(/No autenticado/);
  });
});

describe("portal de soporte: pagos y suspensión", () => {
  it("soporte ve todas las cuentas con su estado", async () => {
    const list = await as(ADMIN, async () => (await rows("SELECT admin_list_accounts() AS l"))[0].l);
    const byName = Object.fromEntries(list.map((a: any) => [a.businessName, a.state]));
    expect(byName["Tienda de Ana"]).toBe("trial_expired");
    // La cuenta de soporte no aparece entre los negocios, aunque tenga perfil y suscripción.
    expect(list.some((a: any) => a.userId === ADMIN)).toBe(false);
    expect(byName["Panadería de Luis"]).toBe("trial");
  });

  it("registrar un pago activa la cuenta por un mes y le devuelve el acceso", async () => {
    const r = await as(ADMIN, async () => (await rows(`SELECT admin_register_payment('${ANA}', 29900, 'nequi', 'REF-1', 1) AS r`))[0].r);
    expect(r).toMatchObject({ state: "active", hasAccess: true });
    expect(r.daysLeft).toBeGreaterThanOrEqual(28);
    expect((await myProducts(ANA)).map((x) => x.id)).toEqual(["p-ana"]);
    await addProduct(ANA, "p-ana-3"); // vuelve a poder escribir
    const pays = await rows(`SELECT "amountCop", method, months FROM payments WHERE "userId" = '${ANA}'`);
    expect(pays).toEqual([{ amountCop: 29900, method: "nequi", months: 1 }]);
  });

  it("al cumplirse el mes sin pagar, el servicio se SUSPENDE SOLO (sin ninguna tarea programada)", async () => {
    await setSub(ANA, `"currentPeriodEnd" = now() - interval '1 second'`);
    expect(await sub(ANA)).toMatchObject({ state: "past_due", hasAccess: false });
    expect(await myProducts(ANA)).toEqual([]);
    await expect(addProduct(ANA, "p-ana-4")).rejects.toThrow(/row-level security|policy/i);
  });

  it("un pago con tiempo vigente suma los meses al final (no se pierde nada)", async () => {
    await as(ADMIN, () => db.query(`SELECT admin_register_payment('${ANA}', 29900, 'efectivo', NULL, 1)`)); // reactiva
    const before = (await rows(`SELECT "currentPeriodEnd" AS e FROM subscriptions WHERE "userId" = '${ANA}'`))[0].e as Date;
    await as(ADMIN, () => db.query(`SELECT admin_register_payment('${ANA}', 59800, 'transferencia', 'REF-2', 2)`));
    const after = (await rows(`SELECT "currentPeriodEnd" AS e FROM subscriptions WHERE "userId" = '${ANA}'`))[0].e as Date;
    const days = (after.getTime() - before.getTime()) / 86400000;
    expect(days).toBeGreaterThan(58);
    expect(days).toBeLessThan(63);
  });

  it("pagar durante la prueba conserva los días de prueba que quedaban", async () => {
    const r = await as(ADMIN, async () => (await rows(`SELECT admin_register_payment('${LUIS}', 29900, 'efectivo', NULL, 1) AS r`))[0].r);
    expect(r.daysLeft).toBeGreaterThanOrEqual(36); // ~7 de prueba + ~30 del mes
  });

  it("suspender bloquea de inmediato aunque el mes esté pagado, y reactivar lo devuelve", async () => {
    await as(ADMIN, () => db.query(`SELECT admin_set_status('${LUIS}', 'suspend', 'Fraude')`));
    expect(await sub(LUIS)).toMatchObject({ state: "suspended", hasAccess: false });
    expect(await myProducts(LUIS)).toEqual([]);
    await as(ADMIN, () => db.query(`SELECT admin_set_status('${LUIS}', 'resume')`));
    expect(await sub(LUIS)).toMatchObject({ state: "active", hasAccess: true });
    expect((await myProducts(LUIS)).length).toBe(1);
  });

  it("no se puede reactivar una cuenta sin periodo vigente", async () => {
    await setSub(LUIS, `"currentPeriodEnd" = now() - interval '1 day', "trialEndsAt" = now() - interval '1 day'`);
    await expect(as(ADMIN, () => db.query(`SELECT admin_set_status('${LUIS}', 'resume')`))).rejects.toThrow(/No hay un periodo vigente/);
  });

  it("cancelar termina la suscripción", async () => {
    await as(ADMIN, () => db.query(`SELECT admin_register_payment('${LUIS}', 29900, 'efectivo', NULL, 1)`));
    await as(ADMIN, () => db.query(`SELECT admin_set_status('${LUIS}', 'cancel')`));
    expect((await sub(LUIS)).state).toBe("cancelled");
  });

  it("extender la prueba solo aplica a cuentas en prueba y valida el rango", async () => {
    const nuevo = "dddddddd-0000-0000-0000-000000000004";
    await as(nuevo, () => db.query("SELECT ensure_subscription()"));
    const r = await as(ADMIN, async () => (await rows(`SELECT admin_extend_trial('${nuevo}', 5) AS r`))[0].r);
    expect(r.daysLeft).toBe(12);
    await expect(as(ADMIN, () => db.query(`SELECT admin_extend_trial('${nuevo}', 0)`))).rejects.toThrow(/entre 1 y 60/);
    await expect(as(ADMIN, () => db.query(`SELECT admin_extend_trial('${ANA}', 5)`))).rejects.toThrow(/Solo se puede extender/);
  });

  it("valida el pago: monto positivo y meses entre 1 y 12", async () => {
    await expect(as(ADMIN, () => db.query(`SELECT admin_register_payment('${ANA}', 0, 'x', NULL, 1)`))).rejects.toThrow(/mayor que cero/);
    await expect(as(ADMIN, () => db.query(`SELECT admin_register_payment('${ANA}', 100, 'x', NULL, 13)`))).rejects.toThrow(/entre 1 y 12/);
  });

  it("soporte puede restablecer el PIN y ver un resumen del negocio", async () => {
    await db.exec(`UPDATE profile SET "securityPin" = 'hash-secreto' WHERE "userId" = '${ANA}'`);
    const antes = await as(ADMIN, async () => (await rows(`SELECT admin_account_summary('${ANA}') AS s`))[0].s);
    expect(antes.profile.hasPin).toBe(true);
    expect(JSON.stringify(antes)).not.toContain("hash-secreto"); // nunca se expone el PIN
    expect(antes.products.total).toBeGreaterThanOrEqual(1);
    await as(ADMIN, () => db.query(`SELECT admin_clear_pin('${ANA}')`));
    const despues = await as(ADMIN, async () => (await rows(`SELECT admin_account_summary('${ANA}') AS s`))[0].s);
    expect(despues.profile.hasPin).toBe(false);
  });

  it("todo lo que hace soporte queda en la bitácora", async () => {
    const log = await as(ADMIN, async () => (await rows(`SELECT admin_audit_log(50) AS l`))[0].l);
    const acciones = new Set(log.map((l: any) => l.action));
    for (const a of ["register_payment", "set_status_suspend", "set_status_resume", "set_status_cancel", "extend_trial", "clear_pin"]) expect(acciones.has(a), a).toBe(true);
    expect(log[0].admin).toBe("soporte@tiendly.co");
  });

  it("el personal de soporte nunca queda bloqueado por la suscripción", async () => {
    await db.exec(`INSERT INTO subscriptions ("userId", status, "trialEndsAt") VALUES ('${ADMIN}', 'suspended', now() - interval '1 day')`);
    expect((await sub(ADMIN)).isAdmin).toBe(true);
    await addProduct(ADMIN, "p-admin"); // no lanza
  });
});

describe("migración", () => {
  it("es repetible sin errores y las cuentas existentes reciben su prueba", async () => {
    await db.exec(`INSERT INTO profile (id, "userId", "businessName") VALUES ('prof_viejo', 'eeeeeeee-0000-0000-0000-000000000005', 'Tienda vieja')`);
    await db.exec(read("insforge-migration-suscripciones.sql"));
    const r = await rows(`SELECT status FROM subscriptions WHERE "userId" = 'eeeeeeee-0000-0000-0000-000000000005'`);
    expect(r).toEqual([{ status: "trial" }]);
  });
});
