-- ======================================================
-- Archivo: insforge-rls-policies.sql
-- Responsabilidad: Políticas de Row-Level Security (RLS) para aislar los
--                   datos de cada tienda en InsForge/Postgres.
--
-- POR QUÉ EXISTE ESTE ARCHIVO:
-- insforge-schema.sql define las tablas con una columna "userId", pero el
-- filtro por "userId" en las consultas (.eq("userId", userId)) se arma en
-- el navegador (src/lib/db.ts). Sin RLS, cualquier usuario autenticado con
-- la anonKey pública (embebida en el bundle, ver insforge-applet-config.json)
-- podría, desde la consola del navegador, cambiar ese filtro o quitarlo y
-- leer/editar el inventario, ventas o deudas de OTRA tienda.
--
-- CÓMO APLICARLO:
-- No fue posible ejecutar este script automáticamente: esta sesión no tiene
-- credenciales administrativas de InsForge (no hay CLI autenticado ni acceso
-- al dashboard). Debes aplicarlo tú mismo desde el editor SQL / consola de
-- administración de tu proyecto InsForge, o vía `insforge db query` si usas
-- el CLI oficial ya autenticado en tu máquina.
--
-- SUPUESTO: auth.uid() (o el equivalente que exponga InsForge) devuelve el
-- id del usuario autenticado actual dentro de una política RLS de Postgres,
-- igual que en Supabase. Verifica en la documentación de InsForge el nombre
-- exacto de esa función antes de ejecutar — si difiere, ajusta las 20
-- políticas de abajo (búsqueda y reemplazo de "auth.uid()").
-- ======================================================

ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- PROFILE
DROP POLICY IF EXISTS profile_select_own ON profile;
CREATE POLICY profile_select_own ON profile FOR SELECT USING (auth.uid()::text = "userId");
DROP POLICY IF EXISTS profile_insert_own ON profile;
CREATE POLICY profile_insert_own ON profile FOR INSERT WITH CHECK (auth.uid()::text = "userId");
DROP POLICY IF EXISTS profile_update_own ON profile;
CREATE POLICY profile_update_own ON profile FOR UPDATE USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");
DROP POLICY IF EXISTS profile_delete_own ON profile;
CREATE POLICY profile_delete_own ON profile FOR DELETE USING (auth.uid()::text = "userId");

-- PRODUCTS
DROP POLICY IF EXISTS products_select_own ON products;
CREATE POLICY products_select_own ON products FOR SELECT USING (auth.uid()::text = "userId");
DROP POLICY IF EXISTS products_insert_own ON products;
CREATE POLICY products_insert_own ON products FOR INSERT WITH CHECK (auth.uid()::text = "userId");
DROP POLICY IF EXISTS products_update_own ON products;
CREATE POLICY products_update_own ON products FOR UPDATE USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");
DROP POLICY IF EXISTS products_delete_own ON products;
CREATE POLICY products_delete_own ON products FOR DELETE USING (auth.uid()::text = "userId");

-- SALES
DROP POLICY IF EXISTS sales_select_own ON sales;
CREATE POLICY sales_select_own ON sales FOR SELECT USING (auth.uid()::text = "userId");
DROP POLICY IF EXISTS sales_insert_own ON sales;
CREATE POLICY sales_insert_own ON sales FOR INSERT WITH CHECK (auth.uid()::text = "userId");
DROP POLICY IF EXISTS sales_update_own ON sales;
CREATE POLICY sales_update_own ON sales FOR UPDATE USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");
DROP POLICY IF EXISTS sales_delete_own ON sales;
CREATE POLICY sales_delete_own ON sales FOR DELETE USING (auth.uid()::text = "userId");

-- TASKS
DROP POLICY IF EXISTS tasks_select_own ON tasks;
CREATE POLICY tasks_select_own ON tasks FOR SELECT USING (auth.uid()::text = "userId");
DROP POLICY IF EXISTS tasks_insert_own ON tasks;
CREATE POLICY tasks_insert_own ON tasks FOR INSERT WITH CHECK (auth.uid()::text = "userId");
DROP POLICY IF EXISTS tasks_update_own ON tasks;
CREATE POLICY tasks_update_own ON tasks FOR UPDATE USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");
DROP POLICY IF EXISTS tasks_delete_own ON tasks;
CREATE POLICY tasks_delete_own ON tasks FOR DELETE USING (auth.uid()::text = "userId");

-- DEBTS
DROP POLICY IF EXISTS debts_select_own ON debts;
CREATE POLICY debts_select_own ON debts FOR SELECT USING (auth.uid()::text = "userId");
DROP POLICY IF EXISTS debts_insert_own ON debts;
CREATE POLICY debts_insert_own ON debts FOR INSERT WITH CHECK (auth.uid()::text = "userId");
DROP POLICY IF EXISTS debts_update_own ON debts;
CREATE POLICY debts_update_own ON debts FOR UPDATE USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");
DROP POLICY IF EXISTS debts_delete_own ON debts;
CREATE POLICY debts_delete_own ON debts FOR DELETE USING (auth.uid()::text = "userId");

-- VERIFICACIÓN MANUAL RECOMENDADA DESPUÉS DE APLICAR:
-- 1. Iniciar sesión como Usuario A, crear un producto.
-- 2. Iniciar sesión como Usuario B, confirmar que NO ve el producto de A
--    (ni consultando la tabla completa sin filtro desde la consola del navegador).
-- 3. Confirmar que Usuario B no puede editar/eliminar registros de A aunque
--    conozca su id (probar con una petición manual cambiando el "userId").
