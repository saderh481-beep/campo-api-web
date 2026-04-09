-- Extender campo cp para códigos postales más largos
ALTER TABLE beneficiarios ALTER COLUMN cp TYPE VARCHAR(10);