-- =============================================================
-- Migracion 007: Corregir tipos de datos en usuarios
-- - Cambiar CHAR(128) a VARCHAR(128) para hash_codigo_acceso
-- - Este cambio arregla el error "value too long for type character(1)"
--   cuando se intenta insertar NULL en hash_codigo_acceso
-- =============================================================

ALTER TABLE usuarios ALTER COLUMN hash_codigo_acceso TYPE VARCHAR(128);