/** Tickets de soporte contra Postgres real: aislamiento, límites, permisos de soporte, lectura/no lectura. */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const ADMIN = "aaaaaaaa-0000-0000-0000-000000000001";
const ANA = "bbbbbbbb-0000-0000-0000-000000000002";
const LUIS = "cccccccc-0000-0000-0000-000000000003";
let db: PGlite;

async function as<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`);
  try { return await fn(); } finally { await db.exec("RESET ROLE"); }
}
const q = async (uid: string | null, sql: string) => as(uid, async () => (await db.query(sql)).rows as any[]);
const one = async (uid: string | null, sql: string) => (await q(uid, sql))[0];
const create = (uid: string, subject = "No me carga la caja", msg = "Cuando toco cobrar no pasa nada", cat = "problema") =>
  one(uid, `SELECT support_create_ticket('${subject}', '${cat}', '${msg}') AS r`).then((r) => r.r);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, public TO authenticated;`);
  await db.exec(read("insforge-schema.sql").replace(/CREATE EXTENSION[^;]*;/g, ""));
  await db.exec(read("insforge-rls-policies.sql"));
  await db.exec(read("insforge-migration-stock-atomico.sql"));
  await db.exec(read("insforge-migration-suscripciones.sql"));
  await db.exec(read("insforge-migration-soporte.sql"));
  await db.exec("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated; GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated");
  await db.exec(`INSERT INTO admins ("userId", email) VALUES ('${ADMIN}', 'soporte@tiendly.co')`);
  for (const [uid, name] of [[ANA, "Tienda de Ana"], [LUIS, "Panadería de Luis"]])
    await db.exec(`INSERT INTO profile (id, "userId", "businessName", email) VALUES ('p_${uid}', '${uid}', '${name}', 'x@y.co')`);
});
afterAll(async () => db.close());

describe("crear solicitudes (cliente)", () => {
  it("crea la solicitud con su primer mensaje y queda pendiente para soporte", async () => {
    const r = await create(ANA);
    expect(r.status).toBe("abierto");
    const mine = (await one(ANA, "SELECT support_my_tickets() AS t")).t;
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ subject: "No me carga la caja", category: "problema", status: "abierto", clientUnread: false });
    expect(mine[0].lastMessage).toContain("no pasa nada");
    expect((await one(ADMIN, "SELECT admin_support_pending_count() AS n")).n).toBe(1);
  });

  it("valida asunto, mensaje y categoría", async () => {
    await expect(create(ANA, "ab", "mensaje largo ok")).rejects.toThrow(/asunto/);
    await expect(create(ANA, "Asunto ok", "abc")).rejects.toThrow(/mensaje/);
    await expect(create(ANA, "Asunto ok", "mensaje largo ok", "otra")).rejects.toThrow(/Categoría/);
    await expect(q(ANA, `SELECT support_create_ticket('${"x".repeat(121)}', 'problema', 'mensaje largo ok')`)).rejects.toThrow(/asunto/);
    await expect(q(ANA, `SELECT support_create_ticket('Asunto ok', 'problema', '${"y".repeat(2001)}')`)).rejects.toThrow(/mensaje/);
  });

  it("sin sesión no puede crear", async () => {
    await expect(q(null, `SELECT support_create_ticket('Asunto ok', 'problema', 'mensaje largo ok')`)).rejects.toThrow(/No autenticado/);
  });

  it("limita a 5 solicitudes abiertas por cliente", async () => {
    for (let i = 0; i < 5; i++) await create(LUIS, `Asunto numero ${i}`, "mensaje de prueba"); // las 5 permitidas
    await expect(create(LUIS, "Una más", "mensaje de prueba")).rejects.toThrow(/5 solicitudes abiertas/);
  });
});

describe("aislamiento entre clientes", () => {
  it("cada cliente solo ve sus solicitudes y mensajes (también leyendo las tablas directamente)", async () => {
    expect((await q(ANA, "SELECT id FROM support_tickets")).length).toBe(1);
    expect((await q(LUIS, "SELECT id FROM support_tickets")).length).toBe(5);
    const anaTicket = (await one(ANA, "SELECT id FROM support_tickets")).id;
    expect((await q(LUIS, `SELECT * FROM support_messages WHERE "ticketId" = ${anaTicket}`)).length).toBe(0);
    await expect(q(LUIS, `SELECT support_ticket_thread(${anaTicket})`)).rejects.toThrow(/no encontrada/);
    await expect(q(LUIS, `SELECT support_reply(${anaTicket}, 'intruso')`)).rejects.toThrow(/no encontrada/);
  });

  it("un cliente no puede escribir las tablas directamente ni cambiar estados", async () => {
    await expect(q(ANA, `INSERT INTO support_tickets ("userId", subject) VALUES ('${ANA}', 'directo')`)).rejects.toThrow();
    await expect(q(ANA, `INSERT INTO support_messages ("ticketId", "authorId", body) VALUES (1, '${ANA}', 'directo')`)).rejects.toThrow();
    const r = await as(ANA, () => db.query(`UPDATE support_tickets SET status = 'resuelto'`));
    expect(r.affectedRows).toBe(0);
  });

  it("un cliente no puede llamar las funciones de soporte", async () => {
    for (const s of ["admin_support_list(NULL)", "admin_support_thread(1)", "admin_support_reply(1, 'hola', 'resuelto')", "admin_support_set_status(1, 'resuelto')", "admin_support_pending_count()"])
      await expect(q(ANA, `SELECT ${s}`), s).rejects.toThrow(/Acceso solo para soporte/);
  });
});

describe("respuesta de soporte", () => {
  let ticket: number;
  it("soporte ve todas las solicitudes con el negocio y el estado de su suscripción", async () => {
    const list = (await one(ADMIN, "SELECT admin_support_list(NULL) AS l")).l;
    expect(list.length).toBe(6);
    const ana = list.find((t: any) => t.businessName === "Tienda de Ana");
    expect(ana).toMatchObject({ status: "abierto", adminUnread: true, subscriptionState: "none", messageCount: 1 });
    ticket = ana.id;
  });

  it("al abrir la conversación se marca como vista por soporte", async () => {
    const th = (await one(ADMIN, `SELECT admin_support_thread(${ticket}) AS t`)).t;
    expect(th.messages).toHaveLength(1);
    expect(th.ticket.businessName).toBe("Tienda de Ana");
    const t = (await db.query(`SELECT "adminUnread" FROM support_tickets WHERE id = ${ticket}`)).rows[0] as any;
    expect(t.adminUnread).toBe(false);
  });

  it("soporte responde: el cliente ve la respuesta y se marca como no leída hasta que la abre", async () => {
    await one(ADMIN, `SELECT admin_support_reply(${ticket}, 'Hola Ana, ya lo estamos revisando', 'en_proceso') AS r`);
    expect((await one(ANA, "SELECT support_unread_count() AS n")).n).toBe(1);
    const mine = (await one(ANA, "SELECT support_my_tickets() AS t")).t[0];
    expect(mine).toMatchObject({ status: "en_proceso", clientUnread: true });
    const th = (await one(ANA, `SELECT support_ticket_thread(${ticket}) AS t`)).t;
    expect(th.messages.map((m: any) => m.isStaff)).toEqual([false, true]);
    expect((await one(ANA, "SELECT support_unread_count() AS n")).n).toBe(0);
  });

  it("si el cliente vuelve a escribir, soporte lo ve pendiente de nuevo", async () => {
    await one(ANA, `SELECT support_reply(${ticket}, 'Gracias, sigo esperando') AS r`);
    expect((await one(ADMIN, "SELECT admin_support_pending_count() AS n")).n).toBeGreaterThanOrEqual(1);
    const t = (await db.query(`SELECT "adminUnread", status FROM support_tickets WHERE id = ${ticket}`)).rows[0] as any;
    expect(t).toMatchObject({ adminUnread: true, status: "en_proceso" });
  });

  it("resolver, y reabrir cuando el cliente escribe", async () => {
    await one(ADMIN, `SELECT admin_support_reply(${ticket}, 'Listo, quedó resuelto', 'resuelto') AS r`);
    expect((await one(ANA, "SELECT support_my_tickets() AS t")).t[0].status).toBe("resuelto");
    await one(ANA, `SELECT support_reply(${ticket}, 'Volvió a fallar') AS r`);
    expect((await one(ANA, "SELECT support_my_tickets() AS t")).t[0].status).toBe("abierto");
  });

  it("valida estados y mensajes de soporte; cambia estado a mano", async () => {
    await expect(q(ADMIN, `SELECT admin_support_reply(${ticket}, 'x', 'borrado')`)).rejects.toThrow(/Estado no válido/);
    await expect(q(ADMIN, `SELECT admin_support_reply(${ticket}, '   ', 'resuelto')`)).rejects.toThrow(/entre 1 y 2000/);
    await expect(q(ADMIN, `SELECT admin_support_thread(99999)`)).rejects.toThrow(/no encontrada/);
    await one(ADMIN, `SELECT admin_support_set_status(${ticket}, 'resuelto') AS r`);
    expect((await one(ADMIN, `SELECT admin_support_list('resuelto') AS l`)).l.map((t: any) => t.id)).toContain(ticket);
  });

  it("lo que hace soporte queda en la bitácora", async () => {
    const log = (await one(ADMIN, `SELECT admin_audit_log(50) AS l`)).l.map((l: any) => l.action);
    expect(log).toContain("support_reply");
    expect(log).toContain("support_status");
  });
});

describe("clientes bloqueados y abuso", () => {
  it("un cliente con la prueba vencida SÍ puede escribir a soporte", async () => {
    await db.exec(`INSERT INTO subscriptions ("userId", "trialEndsAt") VALUES ('${ANA}', now() - interval '1 day') ON CONFLICT ("userId") DO UPDATE SET "trialEndsAt" = now() - interval '1 day'`);
    expect((await one(ANA, "SELECT my_subscription() AS s")).s.hasAccess).toBe(false);
    const open = (await one(ANA, "SELECT support_my_tickets() AS t")).t.filter((t: any) => t.status !== "resuelto").length;
    expect(open).toBeLessThan(5);
    await expect(create(ANA, "No puedo entrar", "Mi prueba terminó y quiero pagar")).resolves.toBeTruthy();
  });

  it("limita los mensajes por hora", async () => {
    const MARIA = "dddddddd-0000-0000-0000-000000000004";
    const t = await create(MARIA, "Prueba de límite", "mensaje inicial");
    let blocked = false;
    for (let i = 0; i < 12 && !blocked; i++) {
      try { await one(MARIA, `SELECT support_reply(${t.id}, 'mensaje ${i}') AS r`); } catch (e: any) { blocked = /muchos mensajes/.test(e.message); }
    }
    expect(blocked).toBe(true);
  });
});
