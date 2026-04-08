-- =============================================================
-- Migracion 005: Restaurar columnas en usuarios
-- - Agregar telefono (opcional)
-- - Agregar activo (boolean, por defecto true)
-- - Agregar created_at y updated_at
-- =============================================================

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_usuarios_login ON usuarios (correo, activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_usuarios_activo_rol ON usuarios (rol, activo) WHERE activo = true;