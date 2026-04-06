-- =============================================================
-- Migracion 003: Actualizar esquema para Railway produccion
-- - roles: 'admin', 'coordinador', 'tecnico'
-- - estado_corte: 'activo', 'en_servicio', 'suspendido', 'baja'
-- - periodo en archive_logs: varchar
-- Fecha: 2026-04-06
-- =============================================================

DO $$
BEGIN
    DROP CONSTRAINT IF EXISTS usuarios_rol_check;
    
    ALTER TABLE usuarios
        ADD CONSTRAINT usuarios_rol_check 
        CHECK (rol IN ('admin', 'coordinador', 'tecnico'));
END $$;

DO $$
BEGIN
    DROP CONSTRAINT IF EXISTS tecnico_detalles_estado_corte_check;
    
    ALTER TABLE tecnico_detalles
        ADD CONSTRAINT tecnico_detalles_estado_corte_check 
        CHECK (estado_corte IN ('activo', 'en_servicio', 'suspendido', 'baja'));
END $$;

ALTER TABLE archive_logs 
    ALTER COLUMN periodo TYPE VARCHAR(20);

ALTER TABLE archive_logs 
    DROP CONSTRAINT IF EXISTS archive_logs_periodo_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_archive_logs_periodo ON archive_logs (periodo);
