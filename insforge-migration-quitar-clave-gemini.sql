-- Tiendly: la clave de Gemini ya no se guarda por tienda (vive solo en el servidor: GEMINI_API_KEY).
-- Ejecuta esto UNA vez en InsForge para borrar las claves que hayan quedado guardadas.
-- Si algún usuario pegó una clave propia, considera rotarla en Google AI Studio.
UPDATE profile SET "geminiApiKey" = NULL WHERE "geminiApiKey" IS NOT NULL;
-- La columna se conserva (la app envía NULL al guardar). Opcional, solo tras desplegar esta versión:
-- ALTER TABLE profile DROP COLUMN "geminiApiKey";
