-- Tiendly: la clave de Gemini ya no se guarda por tienda (vive solo en el servidor: GEMINI_API_KEY).
-- Borra las claves que hayan quedado guardadas. Es seguro ejecutarlo aunque la columna no exista
-- (en bases creadas sin ella no hace nada). Si algún usuario pegó una clave propia, rótala en Google AI Studio.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'profile' AND column_name = 'geminiApiKey'
  ) THEN
    UPDATE profile SET "geminiApiKey" = NULL WHERE "geminiApiKey" IS NOT NULL;
  END IF;
END $$;
