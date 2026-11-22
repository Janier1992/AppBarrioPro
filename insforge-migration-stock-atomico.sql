-- Tiendly: ajuste de stock ATÓMICO e IDEMPOTENTE.
-- Antes la app calculaba "stock nuevo = stock que veía - vendido" y lo escribía como valor absoluto:
-- si dos dispositivos vendían el mismo producto a la vez, uno pisaba al otro y el stock quedaba mal.
-- Esta función suma/resta dentro de la base de datos (una sola instrucción) y registra cada operación
-- por id, así un reintento de red (p. ej. la respuesta se perdió) nunca descuenta dos veces.
-- Ejecuta este script UNA vez en InsForge; es seguro repetirlo. Mientras no exista, la app usa un
-- método de respaldo (leer y escribir): funciona, pero no es atómico.

CREATE TABLE IF NOT EXISTS stock_adjustments (
    op_id VARCHAR(255) PRIMARY KEY,
    "userId" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stock_adjustments_insert_own ON stock_adjustments;
CREATE POLICY stock_adjustments_insert_own ON stock_adjustments FOR INSERT WITH CHECK (auth.uid()::text = "userId");
DROP POLICY IF EXISTS stock_adjustments_select_own ON stock_adjustments;
CREATE POLICY stock_adjustments_select_own ON stock_adjustments FOR SELECT USING (auth.uid()::text = "userId");

CREATE OR REPLACE FUNCTION adjust_stock(p_op_id VARCHAR, p_product_id VARCHAR, p_delta INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER          -- respeta RLS: solo se puede ajustar un producto propio
AS $$
DECLARE
  new_stock INTEGER;
BEGIN
  -- Si esta operación ya se aplicó (reintento), no hace nada.
  INSERT INTO stock_adjustments (op_id, "userId") VALUES (p_op_id, auth.uid()::text)
  ON CONFLICT (op_id) DO NOTHING;
  IF NOT FOUND THEN
    SELECT stock INTO new_stock FROM products WHERE id = p_product_id AND "userId" = auth.uid()::text;
    RETURN new_stock;
  END IF;

  UPDATE products
     SET stock = GREATEST(0, stock + p_delta),
         "updatedAt" = CURRENT_TIMESTAMP
   WHERE id = p_product_id
     AND "userId" = auth.uid()::text
  RETURNING stock INTO new_stock;
  RETURN new_stock;
END;
$$;

GRANT EXECUTE ON FUNCTION adjust_stock(VARCHAR, VARCHAR, INTEGER) TO authenticated;
