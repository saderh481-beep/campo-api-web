-- =============================================================
-- Migración 001: Localidades, Configuraciones, Documentos
--               Plantilla y Estado de Corte en Técnicos
-- Fecha: 2026-03-23
-- Ejecutar en Supabase SQL Editor o cliente psql
-- =============================================================

-- ----------------------------------------------------------------
-- 1. Tabla de localidades (catálogo manual)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS localidades (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  municipio  TEXT        NOT NULL,
  nombre     TEXT        NOT NULL,
  cp         VARCHAR(5),
  activo     BOOLEAN     NOT NULL DEFAULT true,
  created_by UUID        REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_localidades_municipio ON localidades (municipio);

-- ----------------------------------------------------------------
-- 2. Relación opcional: beneficiarios → localidades
-- ----------------------------------------------------------------
ALTER TABLE beneficiarios
  ADD COLUMN IF NOT EXISTS localidad_id UUID REFERENCES localidades(id);

-- ----------------------------------------------------------------
-- 3. Tabla de configuraciones globales
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuraciones (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clave       VARCHAR(80) NOT NULL UNIQUE,
  valor       JSONB       NOT NULL DEFAULT '{}',
  descripcion TEXT,
  updated_by  UUID        REFERENCES usuarios(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed de registros iniciales
INSERT INTO configuraciones (clave, valor, descripcion) VALUES
  (
    'fecha_corte_global',
    '{"fecha": null}',
    'Fecha de cierre global del programa/ciclo. Formato ISO 8601 (ej. "2026-11-30T23:59:59Z").'
  ),
  (
    'ciclo_nombre',
    '{"valor": null}',
    'Nombre del ciclo o ejercicio fiscal activo (ej. "2026").'
  ),
  (
    'pdf_encabezado',
    '{"institucion": "SECRETARÍA DE AGRICULTURA Y DESARROLLO RURAL · HIDALGO", "dependencia": null, "logo_url": null, "pie_pagina": null}',
    'Encabezado y pie de página que aparecen en los PDFs de bitácoras de campo.'
  )
ON CONFLICT (clave) DO NOTHING;

-- ----------------------------------------------------------------
-- 4. Tabla de plantilla de documentos requeridos (lista global)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documentos_plantilla (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT        NOT NULL,
  descripcion TEXT,
  obligatorio BOOLEAN     NOT NULL DEFAULT true,
  orden       INTEGER     NOT NULL DEFAULT 0,
  activo      BOOLEAN     NOT NULL DEFAULT true,
  created_by  UUID        REFERENCES usuarios(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documentos_plantilla_orden ON documentos_plantilla (orden, nombre) WHERE activo = true;

-- ----------------------------------------------------------------
-- 5. Estado de corte por técnico
-- ----------------------------------------------------------------
ALTER TABLE tecnicos
  ADD COLUMN IF NOT EXISTS estado_corte TEXT NOT NULL DEFAULT 'en_servicio'
  CONSTRAINT tecnicos_estado_corte_check
    CHECK (estado_corte IN ('en_servicio', 'corte_aplicado', 'baja'));

-- Aplicar corte retroactivo a técnicos con fecha_limite ya vencida
UPDATE tecnicos
   SET estado_corte = 'corte_aplicado',
       updated_at   = NOW()
 WHERE fecha_limite IS NOT NULL
   AND fecha_limite < NOW()
   AND estado_corte = 'en_servicio'
   AND activo = true;
