-- =============================================================
-- Migracion 004: Limpiar esquema de usuarios
-- - eliminar fecha_limite y estado_corte de usuarios (ya en tecnico_detalles)
-- - created_at/updated_at en tecnico_detalles deben ser NOT NULL
-- Fecha: 2026-04-06
-- =============================================================

ALTER TABLE tecnico_detalles ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE tecnico_detalles ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE usuarios DROP COLUMN IF EXISTS fecha_limite;
ALTER TABLE usuarios DROP COLUMN IF EXISTS estado_corte;