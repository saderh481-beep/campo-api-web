-- =============================================================
-- Migracion: Simplificar usuarios y cambiar hash a SHA-512
-- - Solo nombre, correo, codigo_acceso, hash_codigo_acceso
-- - codigo_acceso: 5-6 digitos
-- - hash_codigo_acceso: 128 caracteres (SHA-512)
-- =============================================================

ALTER TABLE usuarios DROP COLUMN IF EXISTS telefono;
ALTER TABLE usuarios DROP COLUMN IF EXISTS activo;
ALTER TABLE usuarios DROP COLUMN IF EXISTS created_at;
ALTER TABLE usuarios DROP COLUMN IF EXISTS updated_at;

ALTER TABLE usuarios ALTER COLUMN codigo_acceso TYPE VARCHAR(6);
ALTER TABLE usuarios ALTER COLUMN hash_codigo_acceso TYPE CHAR(128);

DROP INDEX IF EXISTS idx_usuarios_login;
DROP INDEX IF EXISTS idx_usuarios_activo_rol;
