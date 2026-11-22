-- ======================================================
-- Archivo: insforge-prueba-rls.sql
-- Responsabilidad: Comprobar en TU base de datos que un cliente NO puede leer, modificar, borrar ni crear datos de
--                  otro cliente (políticas RLS), y que sí puede trabajar con los suyos.
--
-- CÓMO FUNCIONA: simula a un "cliente B" (inventado, no necesita cuenta) intentando atacar los datos de la cuenta A
--   (por defecto isacarmen2). Corre como el rol "authenticated", igual que la app. Al final lanza A PROPÓSITO un
--   error con el informe: eso DESHACE todo (no queda ningún dato de prueba). Lee el informe en el mensaje de error.
--
-- El informe debe terminar en:  RESULTADO: TODAS LAS PRUEBAS PASARON
-- Cualquier línea con ✘ significa un hueco de seguridad real: avísame con el informe completo.
-- ======================================================
DO $$
DECLARE
  a_email TEXT := 'isacarmen2@gmail.com';
  a TEXT;                                   -- id de la cuenta A (la víctima)
  b TEXT := gen_random_uuid()::text;        -- cliente B inventado (el atacante)
  rep TEXT := '';
  fails INT := 0;
  n INT;
  t TEXT;

BEGIN
  SELECT id::text INTO a FROM auth.users WHERE lower(email) = lower(a_email);
  IF a IS NULL THEN RAISE EXCEPTION 'No encontré % en auth.users.', a_email; END IF;

  -- Preparación (como dueño): datos de la víctima y una prueba vigente para B. Todo se deshace al final.
  INSERT INTO subscriptions ("userId", "trialEndsAt") VALUES (a, now() + interval '3 days') ON CONFLICT DO NOTHING;
  INSERT INTO subscriptions ("userId", "trialEndsAt") VALUES (b, now() + interval '3 days');
  INSERT INTO products (id, "userId", name, stock, "minStock") VALUES ('rls-canary-a', a, 'CANARIO-A', 5, 1);
  INSERT INTO sales (id, "userId", total) VALUES ('rls-canary-a', a, 1000);
  INSERT INTO tasks (id, "userId", text) VALUES ('rls-canary-a', a, 'CANARIO-A');
  INSERT INTO debts (id, "userId", "clientName", amount, "dueDate") VALUES ('rls-canary-a', a, 'CANARIO-A', 500, '2026-12-31');
  INSERT INTO products (id, "userId", name, stock, "minStock") VALUES ('rls-canary-b', b, 'CANARIO-B', 5, 1);

  -- A partir de aquí, TODO corre como el cliente B (rol "authenticated", sesión de B).
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', b, true);

  IF auth.uid()::text IS DISTINCT FROM b THEN
    RAISE EXCEPTION 'No se pudo simular la sesión de B (auth.uid() = %). La prueba no es válida en este entorno: envíame el resultado de  SELECT pg_get_functiondef(''auth.uid''::regproc);', auth.uid();
  END IF;
  IF NOT current_has_access() THEN
    RAISE EXCEPTION 'B no tiene acceso vigente: la prueba no sería válida.';
  END IF;
  rep := rep || E'Sesión simulada del cliente B: OK (tiene prueba vigente)\n';

  FOREACH t IN ARRAY ARRAY['products', 'sales', 'tasks', 'debts'] LOOP
    -- 1) B intenta LEER datos de A
    EXECUTE format('SELECT count(*) FROM %I WHERE "userId" = $1', t) INTO n USING a;
    rep := rep || (CASE WHEN n = 0 THEN '✔' ELSE '✘' END) || ' ' || t || ': B lee filas de A -> ' || n || E' (debe ser 0)\n';
    IF n <> 0 THEN fails := fails + 1; END IF;

    -- 2) B intenta leer SIN filtro (como un "select *"): solo debe ver lo suyo
    EXECUTE format('SELECT count(*) FROM %I WHERE "userId" <> $1', t) INTO n USING b;
    rep := rep || (CASE WHEN n = 0 THEN '✔' ELSE '✘' END) || ' ' || t || ': B lee sin filtro y ve filas ajenas -> ' || n || E' (debe ser 0)\n';
    IF n <> 0 THEN fails := fails + 1; END IF;

    -- 3) B intenta MODIFICAR y BORRAR datos de A
    EXECUTE format('UPDATE %I SET "userId" = "userId" WHERE "userId" = $1', t) USING a;
    GET DIAGNOSTICS n = ROW_COUNT;
    rep := rep || (CASE WHEN n = 0 THEN '✔' ELSE '✘' END) || ' ' || t || ': B modifica filas de A -> ' || n || E' (debe ser 0)\n';
    IF n <> 0 THEN fails := fails + 1; END IF;
    EXECUTE format('DELETE FROM %I WHERE "userId" = $1', t) USING a;
    GET DIAGNOSTICS n = ROW_COUNT;
    rep := rep || (CASE WHEN n = 0 THEN '✔' ELSE '✘' END) || ' ' || t || ': B borra filas de A -> ' || n || E' (debe ser 0)\n';
    IF n <> 0 THEN fails := fails + 1; END IF;
  END LOOP;

  -- 4) B intenta CREAR datos a nombre de A (suplantar)
  BEGIN
    INSERT INTO products (id, "userId", name, stock, "minStock") VALUES ('rls-hack', a, 'HACK', 1, 1);
    rep := rep || E'✘ products: B CREÓ un producto a nombre de A (debía bloquearse)\n'; fails := fails + 1;
  EXCEPTION WHEN OTHERS THEN
    rep := rep || E'✔ products: B no puede crear datos a nombre de A (bloqueado)\n';
  END;
  BEGIN
    INSERT INTO sales (id, "userId", total) VALUES ('rls-hack', a, 1);
    rep := rep || E'✘ sales: B CREÓ una venta a nombre de A (debía bloquearse)\n'; fails := fails + 1;
  EXCEPTION WHEN OTHERS THEN
    rep := rep || E'✔ sales: B no puede crear ventas a nombre de A (bloqueado)\n';
  END;

  -- 5) Perfil y suscripción de A
  SELECT count(*) INTO n FROM profile WHERE "userId" = a;
  rep := rep || (CASE WHEN n = 0 THEN '✔' ELSE '✘' END) || ' profile: B lee el perfil de A -> ' || n || E' (debe ser 0)\n';
  IF n <> 0 THEN fails := fails + 1; END IF;
  SELECT count(*) INTO n FROM subscriptions WHERE "userId" = a;
  rep := rep || (CASE WHEN n = 0 THEN '✔' ELSE '✘' END) || ' subscriptions: B lee la suscripción de A -> ' || n || E' (debe ser 0)\n';
  IF n <> 0 THEN fails := fails + 1; END IF;
  UPDATE subscriptions SET "trialEndsAt" = now() + interval '10 years' WHERE "userId" = b;
  GET DIAGNOSTICS n = ROW_COUNT;
  rep := rep || (CASE WHEN n = 0 THEN '✔' ELSE '✘' END) || ' subscriptions: B se alarga su propia prueba -> ' || n || E' filas (debe ser 0)\n';
  IF n <> 0 THEN fails := fails + 1; END IF;

  -- 6) Control positivo: B SÍ ve y puede trabajar con sus propios datos (las reglas no bloquean de más)
  SELECT count(*) INTO n FROM products WHERE "userId" = b;
  rep := rep || (CASE WHEN n = 1 THEN '✔' ELSE '✘' END) || ' products: B ve sus propios datos -> ' || n || E' (debe ser 1)\n';
  IF n <> 1 THEN fails := fails + 1; END IF;

  -- 7) Sin sesión (anónimo) no ve nada
  PERFORM set_config('request.jwt.claim.sub', '', true);
  SELECT count(*) INTO n FROM products;
  rep := rep || (CASE WHEN n = 0 THEN '✔' ELSE '✘' END) || ' products: visitante SIN sesión ve filas -> ' || n || E' (debe ser 0)\n';
  IF n <> 0 THEN fails := fails + 1; END IF;

  RESET ROLE;
  -- Se lanza un error a propósito para DESHACER todo y mostrar el informe.
  RAISE EXCEPTION E'\n===== INFORME DE AISLAMIENTO RLS =====\n%\nRESULTADO: %\n(Este "error" es intencional: deshace los datos de prueba.)', rep,
    CASE WHEN fails = 0 THEN 'TODAS LAS PRUEBAS PASARON' ELSE fails || ' PRUEBA(S) FALLARON: HAY UN HUECO DE SEGURIDAD' END;
END $$;
