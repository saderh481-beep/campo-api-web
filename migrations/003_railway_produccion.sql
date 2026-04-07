-- =============================================================
-- Migracion 003: Actualizar esquema para Railway produccion
-- - roles: 'admin', 'coordinador', 'tecnico'
-- - estado_corte en tecnico_detalles
-- - periodo en archive_logs: varchar
-- - created_at/updated_at en tecnico_detalles
-- - eliminar fecha_limite y estado_corte de usuarios (ya en tecnico_detalles)
-- Fecha: 2026-04-06
-- =============================================================

UPDATE usuarios SET rol = 'admin' WHERE rol = 'administrador';
UPDATE tecnico_detalles SET estado_corte = 'suspendido' WHERE estado_corte = 'corte_aplicado';

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('admin', 'coordinador', 'tecnico'));

ALTER TABLE tecnico_detalles DROP CONSTRAINT IF EXISTS tecnico_detalles_estado_corte_check;
ALTER TABLE tecnico_detalles ADD CONSTRAINT tecnico_detalles_estado_corte_check CHECK (estado_corte IN ('activo', 'en_servicio', 'suspendido', 'baja'));

ALTER TABLE tecnico_detalles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE tecnico_detalles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE usuarios DROP COLUMN IF EXISTS fecha_limite;
ALTER TABLE usuarios DROP COLUMN IF EXISTS estado_corte;

ALTER TABLE archive_logs ALTER COLUMN periodo TYPE VARCHAR(20);
ALTER TABLE archive_logs DROP CONSTRAINT IF EXISTS archive_logs_periodo_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_archive_logs_periodo ON archive_logs (periodo);
