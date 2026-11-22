-- ======================================================
-- Archivo: insforge-auditoria-rls.sql
-- Responsabilidad: AUDITAR (solo lectura) que la seguridad por filas (RLS) de tu base esté bien configurada.
--   No cambia nada ni necesita cambiar el rol de la sesión: funciona en el editor SQL de InsForge.
-- Resultado: una tabla con una fila por verificación. Todas deben tener estado ✔.
-- Cualquier ✘ es un hueco real: el detalle dice qué tabla o política es.
-- Complementa (no reemplaza) la prueba real con dos cuentas en la app.
-- ======================================================
WITH
cuentas(t) AS (VALUES ('profile'), ('products'), ('sales'), ('tasks'), ('debts'), ('subscriptions'), ('payments'), ('admins'), ('admin_audit'), ('support_tickets'), ('support_messages')),
negocio(t) AS (VALUES ('profile'), ('products'), ('sales'), ('tasks'), ('debts')),
bloqueables(t) AS (VALUES ('products'), ('sales'), ('tasks'), ('debts')),
solo_lectura(t) AS (VALUES ('subscriptions'), ('payments'), ('admins'), ('admin_audit'), ('support_tickets'), ('support_messages')),
rlsinfo AS (
  SELECT c.relname AS t, c.relrowsecurity AS activo
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
),
pol AS (SELECT * FROM pg_policies WHERE schemaname = 'public'),
fn AS (
  SELECT p.proname, p.prosecdef, p.proconfig
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND (p.proname LIKE 'admin\_%' OR p.proname LIKE 'support\_%' OR p.proname IN ('ensure_subscription', 'my_subscription', 'current_has_access', 'is_admin', 'subscription_state'))
)
SELECT 1 AS n, 'RLS activado en todas las tablas' AS verificacion,
       CASE WHEN count(*) = 0 THEN '✔' ELSE '✘' END AS estado,
       coalesce(string_agg(c.t, ', '), 'todas lo tienen') AS detalle
FROM cuentas c LEFT JOIN rlsinfo r ON r.t = c.t
WHERE r.activo IS NOT TRUE AND (r.t IS NOT NULL OR c.t NOT LIKE 'support\_%')  -- las tablas de soporte solo se exigen si ya aplicaste esa migración
UNION ALL
SELECT 2, 'Ninguna política abierta a todos (USING true)',
       CASE WHEN count(*) = 0 THEN '✔' ELSE '✘' END,
       coalesce(string_agg(tablename || '.' || policyname, ', '), 'ninguna')
FROM pol WHERE permissive = 'PERMISSIVE' AND (qual = 'true' OR with_check = 'true')
UNION ALL
SELECT 3, 'Las políticas de los datos del negocio están ligadas al usuario (auth.uid())',
       CASE WHEN count(*) = 0 THEN '✔' ELSE '✘' END,
       coalesce(string_agg(tablename || '.' || policyname, ', '), 'todas')
FROM pol WHERE permissive = 'PERMISSIVE' AND tablename IN (SELECT t FROM negocio)
  AND (coalesce(qual, '') || coalesce(with_check, '')) NOT LIKE '%auth.uid()%'
UNION ALL
SELECT 4, 'Productos, ventas, tareas y fiados tienen las 4 operaciones cubiertas (leer, crear, editar, borrar)',
       CASE WHEN count(*) = 0 THEN '✔' ELSE '✘' END,
       coalesce(string_agg(t || ':' || cmd, ', '), 'completas')
FROM (
  SELECT b.t, o.cmd FROM negocio b CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) o(cmd)
  WHERE NOT EXISTS (SELECT 1 FROM pol WHERE pol.tablename = b.t AND pol.permissive = 'PERMISSIVE' AND (pol.cmd = o.cmd OR pol.cmd = 'ALL'))
) faltan
UNION ALL
SELECT 5, 'El bloqueo por suscripción vencida está activo en productos, ventas, tareas y fiados',
       CASE WHEN count(*) = 0 THEN '✔' ELSE '✘' END,
       coalesce(string_agg(t, ', '), 'activo en las 4')
FROM bloqueables b
WHERE NOT EXISTS (SELECT 1 FROM pol WHERE pol.tablename = b.t AND pol.permissive = 'RESTRICTIVE' AND pol.qual LIKE '%current_has_access%')
UNION ALL
SELECT 6, 'Los clientes NO pueden escribir suscripciones, pagos, administradores, bitácora ni tickets directamente',
       CASE WHEN count(*) = 0 THEN '✔' ELSE '✘' END,
       coalesce(string_agg(tablename || '.' || policyname || ' (' || cmd || ')', ', '), 'solo lectura')
FROM pol WHERE tablename IN (SELECT t FROM solo_lectura) AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
UNION ALL
SELECT 7, 'La bitácora de soporte no es legible por clientes',
       CASE WHEN count(*) = 0 THEN '✔' ELSE '✘' END,
       coalesce(string_agg(policyname, ', '), 'sin políticas')
FROM pol WHERE tablename = 'admin_audit'
UNION ALL
SELECT 8, 'Las copias de respaldo (respaldo_*) están cerradas: RLS activo y sin políticas',
       CASE WHEN count(*) = 0 THEN '✔' ELSE '✘' END,
       CASE WHEN count(*) = 0 THEN coalesce((SELECT 'cerradas (' || count(*) || ')' FROM rlsinfo WHERE t LIKE 'respaldo\_%'), 'cerradas') ELSE string_agg(t, ', ') END
FROM rlsinfo r WHERE r.t LIKE 'respaldo\_%' AND (r.activo IS NOT TRUE OR EXISTS (SELECT 1 FROM pol WHERE pol.tablename = r.t))
UNION ALL
SELECT 9, 'Las funciones de suscripción y soporte existen y son seguras (SECURITY DEFINER con search_path fijo)',
       CASE WHEN (SELECT count(*) FROM fn) >= 12 AND (SELECT count(*) FROM fn WHERE NOT prosecdef OR proconfig IS NULL OR NOT EXISTS (SELECT 1 FROM unnest(proconfig) c WHERE c LIKE 'search_path=%')) = 0 THEN '✔' ELSE '✘' END,
       (SELECT count(*) FROM fn) || ' funciones; inseguras: ' ||
       coalesce((SELECT string_agg(proname, ', ') FROM fn WHERE NOT prosecdef OR proconfig IS NULL OR NOT EXISTS (SELECT 1 FROM unnest(proconfig) c WHERE c LIKE 'search_path=%')), 'ninguna')
ORDER BY 1;
