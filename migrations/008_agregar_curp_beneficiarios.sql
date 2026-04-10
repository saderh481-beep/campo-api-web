-- =============================================================
-- Migracion 008: Agregar CURP a beneficiarios
-- - Agregar columna curp para guardar el CURP de chaque beneficiario
-- =============================================================

ALTER TABLE beneficiarios ADD COLUMN curp VARCHAR(18) NULL;