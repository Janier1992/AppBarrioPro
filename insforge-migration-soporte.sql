-- ======================================================
-- Archivo: insforge-migration-soporte.sql
-- Responsabilidad: Tickets de soporte: el cliente reporta un problema o una consulta desde la app y soporte lo ve
--                  en el portal /admin, lo responde y la respuesta le llega al cliente.
--
-- Requiere haber aplicado antes insforge-migration-suscripciones.sql (usa admins, is_admin(), _require_admin(), _audit()).
-- Es seguro repetirlo. Ejecútalo completo en el editor SQL de InsForge.
--
-- SEGURIDAD: cada cliente solo ve SUS tickets (RLS). Nadie escribe las tablas directamente: se escribe con funciones
--   que validan, limitan el abuso (máx. 5 tickets abiertos y 10 mensajes por hora por cliente) y que, en el caso de
--   soporte, verifican is_admin() en el servidor. Un cliente con la prueba vencida o suspendido también puede escribir
--   a soporte (es justamente cuando más lo necesita).
-- ======================================================

CREATE TABLE IF NOT EXISTS support_tickets (
    id BIGSERIAL PRIMARY KEY,
    "userId" VARCHAR(255) NOT NULL,
    subject VARCHAR(120) NOT NULL,
    category VARCHAR(20) NOT NULL DEFAULT 'problema' CHECK (category IN ('problema', 'pago', 'consulta', 'sugerencia')),
    status VARCHAR(20) NOT NULL DEFAULT 'abierto' CHECK (status IN ('abierto', 'en_proceso', 'resuelto')),
    "adminUnread" BOOLEAN NOT NULL DEFAULT TRUE,     -- soporte aún no ha visto lo último del cliente
    "clientUnread" BOOLEAN NOT NULL DEFAULT FALSE,   -- el cliente aún no ha visto la respuesta de soporte
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets("userId");
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, "lastMessageAt" DESC);

CREATE TABLE IF NOT EXISTS support_messages (
    id BIGSERIAL PRIMARY KEY,
    "ticketId" BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    "authorId" VARCHAR(255) NOT NULL,
    "isStaff" BOOLEAN NOT NULL DEFAULT FALSE,
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages("ticketId", "createdAt");

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Solo lectura de lo propio; nadie escribe directamente (solo las funciones de abajo).
DROP POLICY IF EXISTS support_tickets_select_own ON support_tickets;
CREATE POLICY support_tickets_select_own ON support_tickets FOR SELECT USING (auth.uid()::text = "userId");
DROP POLICY IF EXISTS support_messages_select_own ON support_messages;
CREATE POLICY support_messages_select_own ON support_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = "ticketId" AND t."userId" = auth.uid()::text));

-- ----------------------------------------------------------------------------
-- Funciones del CLIENTE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION _support_check_rate(p_user TEXT) RETURNS VOID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF (SELECT COUNT(*) FROM support_messages m JOIN support_tickets t ON t.id = m."ticketId"
       WHERE t."userId" = p_user AND NOT m."isStaff" AND m."createdAt" > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'Has enviado muchos mensajes seguidos. Espera un rato antes de escribir de nuevo.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION support_create_ticket(p_subject TEXT, p_category TEXT, p_message TEXT) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user TEXT := auth.uid()::text;
  v_subject TEXT := trim(coalesce(p_subject, ''));
  v_message TEXT := trim(coalesce(p_message, ''));
  v_id BIGINT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'No autenticado' USING ERRCODE = '28000'; END IF;
  IF char_length(v_subject) < 3 OR char_length(v_subject) > 120 THEN RAISE EXCEPTION 'El asunto debe tener entre 3 y 120 caracteres'; END IF;
  IF char_length(v_message) < 5 OR char_length(v_message) > 2000 THEN RAISE EXCEPTION 'El mensaje debe tener entre 5 y 2000 caracteres'; END IF;
  IF p_category NOT IN ('problema', 'pago', 'consulta', 'sugerencia') THEN RAISE EXCEPTION 'Categoría no válida'; END IF;
  IF (SELECT COUNT(*) FROM support_tickets WHERE "userId" = v_user AND status <> 'resuelto') >= 5 THEN
    RAISE EXCEPTION 'Ya tienes 5 solicitudes abiertas. Espera la respuesta de soporte o responde en una de ellas.';
  END IF;
  PERFORM _support_check_rate(v_user);

  INSERT INTO support_tickets ("userId", subject, category) VALUES (v_user, v_subject, p_category) RETURNING id INTO v_id;
  INSERT INTO support_messages ("ticketId", "authorId", "isStaff", body) VALUES (v_id, v_user, FALSE, v_message);
  RETURN json_build_object('id', v_id, 'status', 'abierto');
END;
$$;

CREATE OR REPLACE FUNCTION support_reply(p_ticket BIGINT, p_body TEXT) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user TEXT := auth.uid()::text;
  v_body TEXT := trim(coalesce(p_body, ''));
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'No autenticado' USING ERRCODE = '28000'; END IF;
  IF char_length(v_body) < 1 OR char_length(v_body) > 2000 THEN RAISE EXCEPTION 'El mensaje debe tener entre 1 y 2000 caracteres'; END IF;
  IF NOT EXISTS (SELECT 1 FROM support_tickets WHERE id = p_ticket AND "userId" = v_user) THEN
    RAISE EXCEPTION 'Solicitud no encontrada';
  END IF;
  PERFORM _support_check_rate(v_user);
  INSERT INTO support_messages ("ticketId", "authorId", "isStaff", body) VALUES (p_ticket, v_user, FALSE, v_body);
  -- Si el cliente escribe de nuevo en una solicitud resuelta, se reabre.
  UPDATE support_tickets
     SET status = CASE WHEN status = 'resuelto' THEN 'abierto' ELSE status END,
         "adminUnread" = TRUE, "lastMessageAt" = now(), "updatedAt" = now()
   WHERE id = p_ticket;
  RETURN json_build_object('id', p_ticket);
END;
$$;

CREATE OR REPLACE FUNCTION support_my_tickets() RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT COALESCE(json_agg(row_to_json(x) ORDER BY x."lastMessageAt" DESC), '[]'::json) FROM (
    SELECT t.id, t.subject, t.category, t.status, t."clientUnread", t."createdAt", t."lastMessageAt",
           (SELECT left(m.body, 140) FROM support_messages m WHERE m."ticketId" = t.id ORDER BY m."createdAt" DESC, m.id DESC LIMIT 1) AS "lastMessage"
    FROM support_tickets t WHERE t."userId" = auth.uid()::text
  ) x
$$;

-- Conversación de un ticket propio; al abrirla se marca como leída.
CREATE OR REPLACE FUNCTION support_ticket_thread(p_ticket BIGINT) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_user TEXT := auth.uid()::text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM support_tickets WHERE id = p_ticket AND "userId" = v_user) THEN
    RAISE EXCEPTION 'Solicitud no encontrada';
  END IF;
  UPDATE support_tickets SET "clientUnread" = FALSE WHERE id = p_ticket AND "clientUnread";
  RETURN json_build_object(
    'ticket', (SELECT row_to_json(t) FROM (SELECT id, subject, category, status, "createdAt", "lastMessageAt" FROM support_tickets WHERE id = p_ticket) t),
    'messages', COALESCE((SELECT json_agg(row_to_json(m) ORDER BY m."createdAt", m.id)
                          FROM (SELECT id, "isStaff", body, "createdAt" FROM support_messages WHERE "ticketId" = p_ticket) m), '[]'::json));
END;
$$;

CREATE OR REPLACE FUNCTION support_unread_count() RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT COUNT(*)::int FROM support_tickets WHERE "userId" = auth.uid()::text AND "clientUnread"
$$;

-- ----------------------------------------------------------------------------
-- Funciones de SOPORTE (todas verifican is_admin() en el servidor)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_support_list(p_status TEXT DEFAULT NULL) RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM _require_admin();
  RETURN COALESCE((
    SELECT json_agg(row_to_json(x) ORDER BY (x.status <> 'resuelto') DESC, x."adminUnread" DESC, x."lastMessageAt" DESC) FROM (
      SELECT t.id, t."userId", t.subject, t.category, t.status, t."adminUnread", t."createdAt", t."lastMessageAt",
             p."businessName", p.email, subscription_state(t."userId") AS "subscriptionState",
             (SELECT left(m.body, 140) FROM support_messages m WHERE m."ticketId" = t.id ORDER BY m."createdAt" DESC, m.id DESC LIMIT 1) AS "lastMessage",
             (SELECT COUNT(*) FROM support_messages m WHERE m."ticketId" = t.id) AS "messageCount"
      FROM support_tickets t LEFT JOIN profile p ON p."userId" = t."userId"
      WHERE p_status IS NULL OR t.status = p_status
    ) x
  ), '[]'::json);
END;
$$;

-- Abre la conversación de cualquier ticket y marca "visto por soporte".
CREATE OR REPLACE FUNCTION admin_support_thread(p_ticket BIGINT) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM _require_admin();
  IF NOT EXISTS (SELECT 1 FROM support_tickets WHERE id = p_ticket) THEN RAISE EXCEPTION 'Solicitud no encontrada'; END IF;
  UPDATE support_tickets SET "adminUnread" = FALSE WHERE id = p_ticket AND "adminUnread";
  RETURN json_build_object(
    'ticket', (SELECT row_to_json(t) FROM (
        SELECT s.id, s."userId", s.subject, s.category, s.status, s."createdAt", s."lastMessageAt",
               p."businessName", p.email, p.phone, subscription_state(s."userId") AS "subscriptionState"
        FROM support_tickets s LEFT JOIN profile p ON p."userId" = s."userId" WHERE s.id = p_ticket) t),
    'messages', COALESCE((SELECT json_agg(row_to_json(m) ORDER BY m."createdAt", m.id)
                          FROM (SELECT id, "isStaff", body, "createdAt" FROM support_messages WHERE "ticketId" = p_ticket) m), '[]'::json));
END;
$$;

-- Responde al cliente. p_status: en_proceso (sigue abierto) o resuelto.
CREATE OR REPLACE FUNCTION admin_support_reply(p_ticket BIGINT, p_body TEXT, p_status TEXT DEFAULT 'en_proceso') RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_body TEXT := trim(coalesce(p_body, ''));
BEGIN
  PERFORM _require_admin();
  IF char_length(v_body) < 1 OR char_length(v_body) > 2000 THEN RAISE EXCEPTION 'El mensaje debe tener entre 1 y 2000 caracteres'; END IF;
  IF p_status NOT IN ('en_proceso', 'resuelto') THEN RAISE EXCEPTION 'Estado no válido'; END IF;
  IF NOT EXISTS (SELECT 1 FROM support_tickets WHERE id = p_ticket) THEN RAISE EXCEPTION 'Solicitud no encontrada'; END IF;
  INSERT INTO support_messages ("ticketId", "authorId", "isStaff", body) VALUES (p_ticket, auth.uid()::text, TRUE, v_body);
  UPDATE support_tickets SET status = p_status, "clientUnread" = TRUE, "adminUnread" = FALSE, "lastMessageAt" = now(), "updatedAt" = now() WHERE id = p_ticket;
  PERFORM _audit('support_reply', (SELECT "userId" FROM support_tickets WHERE id = p_ticket), jsonb_build_object('ticket', p_ticket, 'status', p_status));
  RETURN json_build_object('id', p_ticket, 'status', p_status);
END;
$$;

CREATE OR REPLACE FUNCTION admin_support_set_status(p_ticket BIGINT, p_status TEXT) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM _require_admin();
  IF p_status NOT IN ('abierto', 'en_proceso', 'resuelto') THEN RAISE EXCEPTION 'Estado no válido'; END IF;
  UPDATE support_tickets SET status = p_status, "updatedAt" = now() WHERE id = p_ticket;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada'; END IF;
  PERFORM _audit('support_status', (SELECT "userId" FROM support_tickets WHERE id = p_ticket), jsonb_build_object('ticket', p_ticket, 'status', p_status));
  RETURN json_build_object('id', p_ticket, 'status', p_status);
END;
$$;

-- Solicitudes que esperan a soporte (abiertas con algo sin leer): para el contador de la pestaña.
CREATE OR REPLACE FUNCTION admin_support_pending_count() RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM _require_admin();
  RETURN (SELECT COUNT(*)::int FROM support_tickets WHERE status <> 'resuelto' AND "adminUnread");
END;
$$;

-- ----------------------------------------------------------------------------
-- Permisos
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION _support_check_rate(TEXT) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT ON support_tickets, support_messages TO authenticated;
    GRANT EXECUTE ON FUNCTION
      support_create_ticket(TEXT, TEXT, TEXT), support_reply(BIGINT, TEXT), support_my_tickets(),
      support_ticket_thread(BIGINT), support_unread_count(),
      admin_support_list(TEXT), admin_support_thread(BIGINT), admin_support_reply(BIGINT, TEXT, TEXT),
      admin_support_set_status(BIGINT, TEXT), admin_support_pending_count()
      TO authenticated;
  END IF;
END $$;
