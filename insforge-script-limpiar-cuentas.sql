-- ======================================================
-- Archivo: insforge-script-limpiar-cuentas.sql
-- Responsabilidad: Borrar las cuentas de negocios que ya no se necesitan (por ejemplo, datos de prueba),
--                  conservando SOLO la cuenta indicada y las cuentas de soporte.
--
-- ES UN BORRADO REAL. Por eso:
--   1) Ejecuta primero la VISTA PREVIA (paso 1): muestra exactamente qué cuentas se borrarían y cuántos
--      productos y ventas tiene cada una. No cambia nada.
--   2) El paso 2 hace un RESPALDO de todo lo que borra (tablas "respaldo_...", cerradas con RLS: nadie las
--      lee por la API) y SE NIEGA a borrar si no encuentra la cuenta a conservar.
--   3) Conserva por el ID de la cuenta en InsForge (auth.users), NO por el correo: si hay perfiles repetidos
--      con el mismo correo, se queda solo el de la cuenta real.
--
-- Para conservar otra cuenta, cambia el correo en los DOS pasos.
-- ======================================================

-- ======================== PASO 1: VISTA PREVIA (solo lee) ========================
-- Debe verse la cuenta a conservar en el primer resultado y, en el segundo, solo cuentas que quieres borrar.
SELECT id::text AS "cuenta_que_se_conserva", email
FROM auth.users WHERE lower(email) = lower('isacarmen2@gmail.com');

SELECT p."userId", p.email, p."businessName",
       (SELECT count(*) FROM products x WHERE x."userId" = p."userId") AS productos,
       (SELECT count(*) FROM sales x    WHERE x."userId" = p."userId") AS ventas,
       (SELECT count(*) FROM debts x    WHERE x."userId" = p."userId") AS fiados
FROM profile p
WHERE p."userId" NOT IN (SELECT id::text FROM auth.users WHERE lower(email) = lower('isacarmen2@gmail.com'))
  AND p."userId" NOT IN (SELECT "userId" FROM admins)
ORDER BY p.email, p."businessName";

-- ======================== PASO 2: RESPALDO + BORRADO ========================
-- (Ejecútalo solo después de revisar la vista previa.)
DO $$
DECLARE
  keep_email TEXT := 'isacarmen2@gmail.com';
  keep_ids TEXT[];
  t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(keep_email)) THEN
    RAISE EXCEPTION 'No se encontró % en auth.users: no se borra nada.', keep_email;
  END IF;

  SELECT array_agg(uid) INTO keep_ids FROM (
    SELECT id::text AS uid FROM auth.users WHERE lower(email) = lower(keep_email)
    UNION
    SELECT "userId" FROM admins
  ) k;

  -- Respaldo de lo que se va a borrar (cerrado: RLS activado y sin políticas).
  FOREACH t IN ARRAY ARRAY['profile', 'products', 'sales', 'tasks', 'debts', 'subscriptions', 'payments'] LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I AS SELECT * FROM %I WHERE "userId" <> ALL($1)', 'respaldo_' || t, t) USING keep_ids;
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', 'respaldo_' || t);
  END LOOP;

  -- Borrado
  FOREACH t IN ARRAY ARRAY['products', 'sales', 'tasks', 'debts', 'payments', 'subscriptions', 'profile'] LOOP
    EXECUTE format('DELETE FROM %I WHERE "userId" <> ALL($1)', t) USING keep_ids;
  END LOOP;
  IF to_regclass('public.stock_adjustments') IS NOT NULL THEN
    DELETE FROM stock_adjustments WHERE "userId" <> ALL(keep_ids);
  END IF;
END $$;

-- Verificación: debe quedar solo tu cuenta (y la de soporte, que el portal no lista).
SELECT p."userId", p.email, p."businessName" FROM profile p ORDER BY p.email;
