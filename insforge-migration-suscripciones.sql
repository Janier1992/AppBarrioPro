-- ======================================================
-- Archivo: insforge-migration-suscripciones.sql
-- Responsabilidad: Suscripciones (prueba gratis de 7 días + pago mensual), portal de soporte (admin)
--                  y BLOQUEO EN EL SERVIDOR cuando la prueba o el mes vencen o la cuenta se suspende.
--
-- POR QUÉ EN LA BASE DE DATOS:
--   Bloquear solo en la pantalla se evita con las herramientas del navegador. Aquí el bloqueo es una
--   política de seguridad de filas (RLS) "restrictiva": si la cuenta no tiene acceso vigente, la base de
--   datos rechaza leer o escribir productos, ventas, tareas y fiados, aunque el cliente lo intente.
--
-- ES AUTOMÁTICO (sin tareas programadas): el estado se calcula con las fechas cada vez que se consulta.
--   - Prueba:     acceso hasta "trialEndsAt" (7 días desde el primer ingreso).
--   - Suscripción: acceso hasta "currentPeriodEnd" (cada pago suma meses a esa fecha).
--   - Suspendida o cancelada por soporte: sin acceso de inmediato.
--
-- CÓMO APLICARLO (una sola vez, en el editor SQL de InsForge; es seguro repetirlo):
--   1) Ejecuta este archivo completo.
--   2) Crea tu primer administrador de soporte (reemplaza el id por el de TU usuario de InsForge,
--      el que aparece en Authentication → Users):
--        INSERT INTO admins ("userId", email) VALUES ('ID-DE-TU-USUARIO', 'tu@correo.com');
--   3) Entra a  https://TU-DOMINIO/admin  con ese usuario.
--
-- NOTA SOBRE CUENTAS EXISTENTES: las tiendas que ya existen reciben una prueba nueva de 7 días a
--   partir de hoy (ver la sección "Cuentas existentes"). Si algún cliente ya paga, regístrale el pago
--   desde el portal de soporte.
-- ======================================================

-- ----------------------------------------------------------------------------
-- 0. Corrección del esquema: el PIN se guarda como hash bcrypt (60 caracteres) y la columna original
--    era VARCHAR(10), lo que hace fallar el guardado del perfil cuando el cliente configura un PIN.
-- ----------------------------------------------------------------------------
ALTER TABLE profile ALTER COLUMN "securityPin" TYPE TEXT;

-- ----------------------------------------------------------------------------
-- 1. Tablas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    "userId" VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    "userId" VARCHAR(255) PRIMARY KEY,
    status VARCHAR(20) NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'suspended', 'cancelled')),
    "trialStartedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "currentPeriodEnd" TIMESTAMP WITH TIME ZONE,
    "lastPaymentAt" TIMESTAMP WITH TIME ZONE,
    note TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    "userId" VARCHAR(255) NOT NULL,
    "amountCop" INTEGER NOT NULL CHECK ("amountCop" > 0),
    method VARCHAR(40),
    reference VARCHAR(120),
    months INTEGER NOT NULL DEFAULT 1 CHECK (months BETWEEN 1 AND 12),
    "periodStart" TIMESTAMP WITH TIME ZONE NOT NULL,
    "periodEnd" TIMESTAMP WITH TIME ZONE NOT NULL,
    "recordedBy" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments("userId");

-- Bitácora: quién hizo qué desde el portal de soporte (solo se agrega, nunca se edita).
CREATE TABLE IF NOT EXISTS admin_audit (
    id BIGSERIAL PRIMARY KEY,
    "adminId" VARCHAR(255) NOT NULL,
    action VARCHAR(60) NOT NULL,
    "targetUserId" VARCHAR(255),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit("createdAt" DESC);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo LEE lo suyo. Nadie escribe estas tablas directamente: solo las funciones de abajo.
DROP POLICY IF EXISTS admins_select_own ON admins;
CREATE POLICY admins_select_own ON admins FOR SELECT USING (auth.uid()::text = "userId");
DROP POLICY IF EXISTS subscriptions_select_own ON subscriptions;
CREATE POLICY subscriptions_select_own ON subscriptions FOR SELECT USING (auth.uid()::text = "userId");
DROP POLICY IF EXISTS payments_select_own ON payments;
CREATE POLICY payments_select_own ON payments FOR SELECT USING (auth.uid()::text = "userId");
-- admin_audit: sin políticas = nadie la lee ni escribe directamente (solo las funciones de soporte).

-- ----------------------------------------------------------------------------
-- 2. Estado de la suscripción (se calcula con las fechas: no hay nada que "vencer" a mano)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION subscription_grace_days() RETURNS INTEGER
LANGUAGE sql IMMUTABLE AS $$ SELECT 0 $$;  -- días de gracia tras vencer el mes (0 = se suspende al vencer)

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE "userId" = auth.uid()::text)
$$;

-- Devuelve: none | trial | trial_expired | active | past_due | suspended | cancelled
CREATE OR REPLACE FUNCTION subscription_state(p_user TEXT) RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN s.status = 'suspended' THEN 'suspended'
      WHEN s.status = 'cancelled' THEN 'cancelled'
      WHEN s.status = 'active' AND s."currentPeriodEnd" IS NOT NULL
           AND now() <= s."currentPeriodEnd" + make_interval(days => subscription_grace_days()) THEN 'active'
      WHEN s.status = 'active' THEN 'past_due'
      WHEN s.status = 'trial' AND now() <= s."trialEndsAt" THEN 'trial'
      ELSE 'trial_expired'
    END
    FROM subscriptions s WHERE s."userId" = p_user
  ), 'none')
$$;

-- ¿La sesión actual puede usar el negocio? (el personal de soporte siempre puede)
CREATE OR REPLACE FUNCTION current_has_access() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT is_admin() OR subscription_state(auth.uid()::text) IN ('trial', 'active')
$$;

-- Resumen de una cuenta para el cliente (y para el portal): estado, fechas y días restantes.
CREATE OR REPLACE FUNCTION _subscription_json(p_user TEXT) RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT json_build_object(
    'userId', p_user,
    'state', subscription_state(p_user),
    'status', s.status,
    'trialEndsAt', s."trialEndsAt",
    'currentPeriodEnd', s."currentPeriodEnd",
    'lastPaymentAt', s."lastPaymentAt",
    'hasAccess', subscription_state(p_user) IN ('trial', 'active'),
    'daysLeft', CASE
        WHEN subscription_state(p_user) = 'trial' THEN GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s."trialEndsAt" - now())) / 86400))::int
        WHEN subscription_state(p_user) = 'active' THEN GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s."currentPeriodEnd" - now())) / 86400))::int
        ELSE 0 END,
    'serverTime', now()
  )
  FROM (SELECT p_user AS uid) q LEFT JOIN subscriptions s ON s."userId" = q.uid
$$;

CREATE OR REPLACE FUNCTION my_subscription() RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT (_subscription_json(auth.uid()::text)::jsonb || jsonb_build_object('isAdmin', is_admin()))::json
$$;

-- Primer ingreso: crea la prueba de 7 días UNA sola vez (si ya existe, no la reinicia).
CREATE OR REPLACE FUNCTION ensure_subscription() RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado' USING ERRCODE = '28000'; END IF;
  INSERT INTO subscriptions ("userId", status, "trialStartedAt", "trialEndsAt")
  VALUES (auth.uid()::text, 'trial', now(), now() + interval '7 days')
  ON CONFLICT ("userId") DO NOTHING;
  RETURN my_subscription();
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. BLOQUEO EN EL SERVIDOR: sin acceso vigente, la base rechaza leer/escribir el negocio.
--    (La tabla "profile" no se bloquea: así la app puede mostrar la pantalla de "activa tu suscripción".)
-- ----------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['products', 'sales', 'tasks', 'debts'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_require_access', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I AS RESTRICTIVE FOR ALL USING (current_has_access()) WITH CHECK (current_has_access())',
      t || '_require_access', t);
  END LOOP;
  -- Registro del stock atómico (existe si ya aplicaste insforge-migration-stock-atomico.sql).
  IF to_regclass('public.stock_adjustments') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS stock_adjustments_require_access ON stock_adjustments';
    EXECUTE 'CREATE POLICY stock_adjustments_require_access ON stock_adjustments AS RESTRICTIVE FOR ALL USING (current_has_access()) WITH CHECK (current_has_access())';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Funciones del portal de soporte. TODAS verifican is_admin() en el servidor.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION _require_admin() RETURNS VOID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Acceso solo para soporte' USING ERRCODE = '42501'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION _audit(p_action TEXT, p_target TEXT, p_details JSONB) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  INSERT INTO admin_audit ("adminId", action, "targetUserId", details)
  VALUES (auth.uid()::text, p_action, p_target, COALESCE(p_details, '{}'::jsonb))
$$;

-- Todas las cuentas (con y sin suscripción) y su estado.
CREATE OR REPLACE FUNCTION admin_list_accounts() RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM _require_admin();
  RETURN COALESCE((
    SELECT json_agg(row_to_json(r) ORDER BY r."createdAt" DESC NULLS LAST)
    FROM (
      SELECT u.uid AS "userId",
             p."businessName", p.email, p.phone,
             subscription_state(u.uid) AS state,
             s.status, s."trialEndsAt", s."currentPeriodEnd", s."lastPaymentAt", s.note,
             COALESCE(s."createdAt", p."updatedAt") AS "createdAt",
             (SELECT COUNT(*) FROM payments pay WHERE pay."userId" = u.uid) AS "paymentsCount"
      FROM (SELECT "userId" AS uid FROM subscriptions UNION SELECT "userId" FROM profile) u
      LEFT JOIN profile p ON p."userId" = u.uid
      LEFT JOIN subscriptions s ON s."userId" = u.uid
    ) r
  ), '[]'::json);
END;
$$;

-- Registra un pago (efectivo, transferencia, Nequi…) y suma meses de acceso.
-- Si aún queda tiempo vigente, los meses se suman AL FINAL de ese tiempo (no se pierde nada).
CREATE OR REPLACE FUNCTION admin_register_payment(
  p_user TEXT, p_amount INTEGER, p_method TEXT, p_reference TEXT, p_months INTEGER DEFAULT 1
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_base TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  s subscriptions%ROWTYPE;
BEGIN
  PERFORM _require_admin();
  IF p_months < 1 OR p_months > 12 THEN RAISE EXCEPTION 'Los meses deben estar entre 1 y 12'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'El monto debe ser mayor que cero'; END IF;

  INSERT INTO subscriptions ("userId", status, "trialEndsAt") VALUES (p_user, 'trial', now())
  ON CONFLICT ("userId") DO NOTHING;
  SELECT * INTO s FROM subscriptions WHERE "userId" = p_user FOR UPDATE;

  v_base := GREATEST(now(), CASE
    WHEN s.status = 'active' THEN COALESCE(s."currentPeriodEnd", now())
    WHEN s.status = 'trial' THEN s."trialEndsAt"
    ELSE now() END);
  v_end := v_base + make_interval(months => p_months);

  UPDATE subscriptions
     SET status = 'active', "currentPeriodEnd" = v_end, "lastPaymentAt" = now(), "updatedAt" = now()
   WHERE "userId" = p_user;
  INSERT INTO payments ("userId", "amountCop", method, reference, months, "periodStart", "periodEnd", "recordedBy")
  VALUES (p_user, p_amount, NULLIF(trim(p_method), ''), NULLIF(trim(p_reference), ''), p_months, v_base, v_end, auth.uid()::text);
  PERFORM _audit('register_payment', p_user, jsonb_build_object('amount', p_amount, 'months', p_months, 'method', p_method, 'reference', p_reference, 'until', v_end));
  RETURN _subscription_json(p_user);
END;
$$;

-- suspend = bloquea ya · cancel = termina la suscripción · resume = reactiva si queda tiempo vigente.
CREATE OR REPLACE FUNCTION admin_set_status(p_user TEXT, p_action TEXT, p_note TEXT DEFAULT NULL) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s subscriptions%ROWTYPE;
BEGIN
  PERFORM _require_admin();
  IF p_action NOT IN ('suspend', 'cancel', 'resume') THEN RAISE EXCEPTION 'Acción no válida: %', p_action; END IF;
  SELECT * INTO s FROM subscriptions WHERE "userId" = p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La cuenta no tiene suscripción registrada'; END IF;

  IF p_action = 'suspend' THEN
    UPDATE subscriptions SET status = 'suspended', note = COALESCE(p_note, note), "updatedAt" = now() WHERE "userId" = p_user;
  ELSIF p_action = 'cancel' THEN
    UPDATE subscriptions SET status = 'cancelled', note = COALESCE(p_note, note), "updatedAt" = now() WHERE "userId" = p_user;
  ELSE
    IF s."currentPeriodEnd" IS NOT NULL AND s."currentPeriodEnd" > now() THEN
      UPDATE subscriptions SET status = 'active', note = COALESCE(p_note, note), "updatedAt" = now() WHERE "userId" = p_user;
    ELSIF s."trialEndsAt" > now() THEN
      UPDATE subscriptions SET status = 'trial', note = COALESCE(p_note, note), "updatedAt" = now() WHERE "userId" = p_user;
    ELSE
      RAISE EXCEPTION 'No hay un periodo vigente: registra un pago o extiende la prueba';
    END IF;
  END IF;
  PERFORM _audit('set_status_' || p_action, p_user, jsonb_build_object('note', p_note));
  RETURN _subscription_json(p_user);
END;
$$;

-- Extiende la prueba (por ejemplo, un cliente que no alcanzó a probarla). Solo para cuentas en prueba.
CREATE OR REPLACE FUNCTION admin_extend_trial(p_user TEXT, p_days INTEGER) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s subscriptions%ROWTYPE;
BEGIN
  PERFORM _require_admin();
  IF p_days < 1 OR p_days > 60 THEN RAISE EXCEPTION 'Los días deben estar entre 1 y 60'; END IF;
  SELECT * INTO s FROM subscriptions WHERE "userId" = p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La cuenta no tiene suscripción registrada'; END IF;
  IF s.status <> 'trial' THEN RAISE EXCEPTION 'Solo se puede extender la prueba de cuentas en prueba (estado actual: %)', s.status; END IF;
  UPDATE subscriptions SET "trialEndsAt" = GREATEST(now(), "trialEndsAt") + make_interval(days => p_days), "updatedAt" = now()
   WHERE "userId" = p_user;
  PERFORM _audit('extend_trial', p_user, jsonb_build_object('days', p_days));
  RETURN _subscription_json(p_user);
END;
$$;

CREATE OR REPLACE FUNCTION admin_set_note(p_user TEXT, p_note TEXT) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM _require_admin();
  UPDATE subscriptions SET note = NULLIF(trim(p_note), ''), "updatedAt" = now() WHERE "userId" = p_user;
  PERFORM _audit('set_note', p_user, jsonb_build_object('note', p_note));
  RETURN _subscription_json(p_user);
END;
$$;

-- Soporte: quita el PIN de bloqueo si el cliente lo olvidó.
CREATE OR REPLACE FUNCTION admin_clear_pin(p_user TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM _require_admin();
  UPDATE profile SET "securityPin" = '' WHERE "userId" = p_user;
  PERFORM _audit('clear_pin', p_user, '{}'::jsonb);
END;
$$;

-- Vista de solo lectura del negocio de un cliente (sin exponer filas sueltas): para diagnosticar fallas.
CREATE OR REPLACE FUNCTION admin_account_summary(p_user TEXT) RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM _require_admin();
  RETURN json_build_object(
    'subscription', _subscription_json(p_user),
    'profile', (SELECT row_to_json(x) FROM (
        SELECT "businessName", email, phone, address, hours, "lowStockThreshold", ("securityPin" <> '') AS "hasPin", theme, "updatedAt"
        FROM profile WHERE "userId" = p_user) x),
    'products', (SELECT json_build_object('total', COUNT(*), 'lowStock', COUNT(*) FILTER (WHERE stock <= "minStock"),
                                           'outOfStock', COUNT(*) FILTER (WHERE stock = 0)) FROM products WHERE "userId" = p_user),
    'sales', (SELECT json_build_object('total', COUNT(*), 'last30Days', COUNT(*) FILTER (WHERE timestamp >= now() - interval '30 days'),
                                        'last30DaysAmount', COALESCE(SUM(total) FILTER (WHERE timestamp >= now() - interval '30 days'), 0),
                                        'lastSaleAt', MAX(timestamp)) FROM sales WHERE "userId" = p_user),
    'debts', (SELECT json_build_object('open', COUNT(*) FILTER (WHERE NOT paid), 'openAmount', COALESCE(SUM(amount) FILTER (WHERE NOT paid), 0))
              FROM debts WHERE "userId" = p_user),
    'tasks', (SELECT json_build_object('pending', COUNT(*) FILTER (WHERE NOT completed), 'total', COUNT(*)) FROM tasks WHERE "userId" = p_user),
    'payments', COALESCE((SELECT json_agg(row_to_json(pp) ORDER BY pp."createdAt" DESC) FROM (
        SELECT "amountCop", method, reference, months, "periodStart", "periodEnd", "createdAt"
        FROM payments WHERE "userId" = p_user ORDER BY "createdAt" DESC LIMIT 12) pp), '[]'::json)
  );
END;
$$;

CREATE OR REPLACE FUNCTION admin_audit_log(p_limit INTEGER DEFAULT 100) RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM _require_admin();
  RETURN COALESCE((
    SELECT json_agg(row_to_json(l)) FROM (
      SELECT a.id, a.action, a."targetUserId", a.details, a."createdAt",
             COALESCE(ad.email, a."adminId") AS admin,
             pr."businessName" AS "targetBusiness"
      FROM admin_audit a
      LEFT JOIN admins ad ON ad."userId" = a."adminId"
      LEFT JOIN profile pr ON pr."userId" = a."targetUserId"
      ORDER BY a."createdAt" DESC LIMIT LEAST(GREATEST(p_limit, 1), 500)) l
  ), '[]'::json);
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Permisos: cualquier usuario autenticado puede LLAMAR las funciones, pero las de soporte
--    se niegan por dentro (_require_admin) a quien no esté en la tabla admins.
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION _require_admin(), _audit(TEXT, TEXT, JSONB), _subscription_json(TEXT), subscription_state(TEXT) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT ON admins, subscriptions, payments TO authenticated;
    GRANT EXECUTE ON FUNCTION
      is_admin(), current_has_access(), my_subscription(), ensure_subscription(),
      admin_list_accounts(), admin_register_payment(TEXT, INTEGER, TEXT, TEXT, INTEGER),
      admin_set_status(TEXT, TEXT, TEXT), admin_extend_trial(TEXT, INTEGER), admin_set_note(TEXT, TEXT),
      admin_clear_pin(TEXT), admin_account_summary(TEXT), admin_audit_log(INTEGER)
      TO authenticated;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. Cuentas existentes: prueba de 7 días a partir de hoy (se omite si ya tienen suscripción).
--    Si prefieres que algunas arranquen como pagadas, regístrales el pago desde el portal de soporte.
-- ----------------------------------------------------------------------------
INSERT INTO subscriptions ("userId", status, "trialStartedAt", "trialEndsAt")
SELECT DISTINCT "userId", 'trial', now(), now() + interval '7 days' FROM profile
ON CONFLICT ("userId") DO NOTHING;
