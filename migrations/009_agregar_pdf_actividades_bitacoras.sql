-- Migration: Add pdf_actividades_url to bitacoras table
ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS pdf_actividades_url TEXT;