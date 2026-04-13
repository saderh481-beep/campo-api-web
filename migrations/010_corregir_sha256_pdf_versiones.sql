-- Corregir tipo de columna sha256 en pdf_versiones
ALTER TABLE pdf_versiones ALTER COLUMN sha256 TYPE CHAR(64);

-- Corregir tipo de columna sha256 en documentos
ALTER TABLE documentos ALTER COLUMN sha256 TYPE CHAR(64);

-- Corregir tipo de columna sha256 en documentos_pdf
ALTER TABLE documentos_pdf ALTER COLUMN sha256 TYPE CHAR(64);