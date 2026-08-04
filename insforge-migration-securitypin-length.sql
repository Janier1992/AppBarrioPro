-- ======================================================
-- Archivo: insforge-migration-securitypin-length.sql
-- CRÍTICO — aplicar cuanto antes.
--
-- Por qué: la columna "securityPin" se creó como VARCHAR(10), pensada para
-- guardar el PIN de 4 dígitos en texto plano. Al implementar el hasheo con
-- bcrypt (por seguridad), el valor guardado pasó a tener ~60 caracteres —
-- la base de datos rechaza CUALQUIER intento de guardar un PIN con el error
-- "value too long for type character varying(10)". Ahora mismo, ningún
-- tendero puede configurar su PIN de seguridad en producción.
--
-- Este script solo amplía el tamaño de la columna; no borra ni modifica
-- ningún dato existente. Es seguro ejecutarlo en cualquier momento.
-- ======================================================

ALTER TABLE profile ALTER COLUMN "securityPin" TYPE VARCHAR(255);

-- Verificación (debe mostrar 255 en character_maximum_length):
-- SELECT column_name, character_maximum_length
-- FROM information_schema.columns
-- WHERE table_name = 'profile' AND column_name = 'securityPin';
