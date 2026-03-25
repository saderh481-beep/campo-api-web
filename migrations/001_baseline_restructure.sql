-- =============================================================
-- Migracion base: estructura versionada, tecnicos en usuarios,
-- zonas, configuracion JSON de documentos y formatos PDF
-- Fecha: 2026-03-24
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correo VARCHAR(255) NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  rol VARCHAR(40) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  codigo_acceso CHAR(6),
  hash_codigo_acceso TEXT,
  telefono TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_rol_check'
  ) THEN
    ALTER TABLE usuarios
      ADD CONSTRAINT usuarios_rol_check
      CHECK (rol IN ('administrador', 'coordinador', 'tecnico'));
  END IF;

END $$;

CREATE TABLE IF NOT EXISTS tecnico_detalles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tecnico_id UUID NOT NULL UNIQUE REFERENCES usuarios(id),
  coordinador_id UUID NOT NULL REFERENCES usuarios(id),
  fecha_limite TIMESTAMPTZ,
  estado_corte TEXT NOT NULL DEFAULT 'en_servicio',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tecnico_detalles_estado_corte_check'
  ) THEN
    ALTER TABLE tecnico_detalles
      ADD CONSTRAINT tecnico_detalles_estado_corte_check
      CHECK (estado_corte IN ('en_servicio', 'corte_aplicado', 'baja'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS actividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cadenas_productivas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zonas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS localidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zona_id UUID REFERENCES zonas(id),
  municipio TEXT NOT NULL,
  nombre TEXT NOT NULL,
  cp VARCHAR(5),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS configuraciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave VARCHAR(80) NOT NULL UNIQUE,
  valor JSONB NOT NULL DEFAULT '{}'::jsonb,
  descripcion TEXT,
  updated_by UUID REFERENCES usuarios(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documentos_plantilla (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  obligatorio BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  configuracion JSONB NOT NULL DEFAULT '{}'::jsonb,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS beneficiarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tecnico_id UUID NOT NULL REFERENCES usuarios(id),
  nombre VARCHAR(255) NOT NULL,
  municipio VARCHAR(255) NOT NULL,
  localidad VARCHAR(255),
  direccion TEXT,
  cp VARCHAR(5),
  telefono_principal TEXT,
  telefono_secundario TEXT,
  coord_parcela POINT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  localidad_id UUID REFERENCES localidades(id)
);

CREATE TABLE IF NOT EXISTS beneficiario_cadenas (
  beneficiario_id UUID NOT NULL REFERENCES beneficiarios(id),
  cadena_id UUID NOT NULL REFERENCES cadenas_productivas(id),
  activo BOOLEAN NOT NULL DEFAULT true,
  asignado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (beneficiario_id, cadena_id)
);

CREATE TABLE IF NOT EXISTS asignaciones_beneficiario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tecnico_id UUID NOT NULL REFERENCES usuarios(id),
  beneficiario_id UUID NOT NULL REFERENCES beneficiarios(id),
  activo BOOLEAN NOT NULL DEFAULT true,
  asignado_por UUID NOT NULL REFERENCES usuarios(id),
  asignado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removido_en TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS asignaciones_actividad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tecnico_id UUID NOT NULL REFERENCES usuarios(id),
  actividad_id UUID NOT NULL REFERENCES actividades(id),
  activo BOOLEAN NOT NULL DEFAULT true,
  asignado_por UUID NOT NULL REFERENCES usuarios(id),
  asignado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removido_en TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bitacoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(80) NOT NULL,
  tecnico_id UUID NOT NULL REFERENCES usuarios(id),
  beneficiario_id UUID REFERENCES beneficiarios(id),
  cadena_productiva_id UUID REFERENCES cadenas_productivas(id),
  actividad_id UUID REFERENCES actividades(id),
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ,
  coord_inicio POINT,
  coord_fin POINT,
  actividades_desc TEXT NOT NULL DEFAULT '',
  recomendaciones TEXT DEFAULT '',
  comentarios_beneficiario TEXT DEFAULT '',
  coordinacion_interinst BOOLEAN NOT NULL DEFAULT false,
  instancia_coordinada VARCHAR(255),
  proposito_coordinacion TEXT,
  observaciones_coordinador TEXT,
  foto_rostro_url TEXT,
  firma_url TEXT,
  fotos_campo TEXT[] NOT NULL DEFAULT '{}'::text[],
  estado VARCHAR(40) NOT NULL DEFAULT 'borrador',
  pdf_version SMALLINT NOT NULL DEFAULT 0,
  pdf_url_actual TEXT,
  pdf_original_url TEXT,
  pdf_edicion JSONB NOT NULL DEFAULT '{}'::jsonb,
  creada_offline BOOLEAN NOT NULL DEFAULT false,
  sync_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_id UUID NOT NULL REFERENCES beneficiarios(id),
  tipo VARCHAR(120) NOT NULL,
  nombre_original VARCHAR(255),
  r2_key TEXT NOT NULL,
  sha256 CHAR(64) NOT NULL,
  bytes INTEGER,
  subido_por UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documentos_pdf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave VARCHAR(120) NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  mime_type VARCHAR(120) NOT NULL DEFAULT 'application/pdf',
  bytes INTEGER,
  r2_key TEXT NOT NULL,
  sha256 CHAR(64) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pdf_versiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bitacora_id UUID NOT NULL REFERENCES bitacoras(id),
  version SMALLINT NOT NULL,
  r2_key TEXT NOT NULL,
  sha256 CHAR(64) NOT NULL,
  inmutable BOOLEAN NOT NULL DEFAULT false,
  generado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destino_id UUID NOT NULL,
  destino_tipo VARCHAR(50) NOT NULL,
  tipo VARCHAR(80) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  cuerpo TEXT NOT NULL,
  leido BOOLEAN NOT NULL DEFAULT false,
  enviado_push BOOLEAN NOT NULL DEFAULT false,
  enviado_email BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  actor_tipo VARCHAR(40) NOT NULL,
  accion VARCHAR(80) NOT NULL,
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS archive_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo CHAR(7) NOT NULL,
  total_bitacoras INTEGER NOT NULL DEFAULT 0,
  total_fotos INTEGER NOT NULL DEFAULT 0,
  bytes_comprimidos BIGINT NOT NULL DEFAULT 0,
  r2_key_staging TEXT,
  zip_public_url TEXT,
  sha256_paquete CHAR(64),
  estructura JSONB NOT NULL DEFAULT '{}'::jsonb,
  estado VARCHAR(40) NOT NULL DEFAULT 'generando',
  descargado_en TIMESTAMPTZ,
  confirmado_en TIMESTAMPTZ,
  confirmado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE localidades ADD COLUMN IF NOT EXISTS zona_id UUID REFERENCES zonas(id);
ALTER TABLE documentos_plantilla ADD COLUMN IF NOT EXISTS configuracion JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS pdf_edicion JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE archive_logs ADD COLUMN IF NOT EXISTS zip_public_url TEXT;
ALTER TABLE archive_logs ADD COLUMN IF NOT EXISTS estructura JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'beneficiarios' AND column_name = 'telefono_principal' AND data_type = 'bytea'
  ) THEN
    ALTER TABLE beneficiarios
      ALTER COLUMN telefono_principal TYPE TEXT USING CASE WHEN telefono_principal IS NULL THEN NULL ELSE convert_from(telefono_principal, 'UTF8') END,
      ALTER COLUMN telefono_secundario TYPE TEXT USING CASE WHEN telefono_secundario IS NULL THEN NULL ELSE convert_from(telefono_secundario, 'UTF8') END;
  END IF;
END $$;

DO $$
DECLARE r RECORD;
DECLARE fk_name TEXT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tecnicos'
  ) THEN
    CREATE TEMP TABLE _tmp_tecnico_usuario_map (
      tecnico_id UUID PRIMARY KEY,
      usuario_id UUID NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO _tmp_tecnico_usuario_map (tecnico_id, usuario_id)
    SELECT t.id, u.id
    FROM tecnicos t
    JOIN usuarios u ON u.correo = t.correo AND u.rol = 'tecnico';

    UPDATE usuarios u
    SET telefono = COALESCE(u.telefono, t.telefono),
        codigo_acceso = COALESCE(u.codigo_acceso, t.codigo_acceso),
        activo = COALESCE(u.activo, t.activo),
        updated_at = NOW()
    FROM tecnicos t
    WHERE u.id = (SELECT m.usuario_id FROM _tmp_tecnico_usuario_map m WHERE m.tecnico_id = t.id);

    INSERT INTO tecnico_detalles (tecnico_id, coordinador_id, fecha_limite, estado_corte, activo)
    SELECT m.usuario_id, t.coordinador_id, t.fecha_limite, COALESCE(t.estado_corte, 'en_servicio'), t.activo
    FROM tecnicos t
    JOIN _tmp_tecnico_usuario_map m ON m.tecnico_id = t.id
    ON CONFLICT (tecnico_id) DO UPDATE SET
      coordinador_id = EXCLUDED.coordinador_id,
      fecha_limite = EXCLUDED.fecha_limite,
      estado_corte = EXCLUDED.estado_corte,
      activo = EXCLUDED.activo,
      updated_at = NOW();

    FOR r IN
      SELECT table_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'tecnico_id' AND table_name <> 'tecnicos'
    LOOP
      EXECUTE format(
        'UPDATE %I x SET tecnico_id = m.usuario_id FROM _tmp_tecnico_usuario_map m WHERE x.tecnico_id = m.tecnico_id',
        r.table_name
      );
    END LOOP;

    FOR r IN
      SELECT tc.table_name, tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'tecnicos'
    LOOP
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
    END LOOP;

    FOR r IN
      SELECT table_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'tecnico_id' AND table_name <> 'tecnicos'
    LOOP
      fk_name := r.table_name || '_tecnico_id_usuarios_fkey';
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' AND table_name = r.table_name AND constraint_name = fk_name
      ) THEN
        EXECUTE format(
          'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (tecnico_id) REFERENCES usuarios(id)',
          r.table_name,
          fk_name
        );
      END IF;
    END LOOP;

    DROP TABLE IF EXISTS tecnicos;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios' AND column_name = 'coordinador_id'
  ) THEN
    INSERT INTO tecnico_detalles (tecnico_id, coordinador_id, fecha_limite, estado_corte, activo)
    SELECT u.id, u.coordinador_id, u.fecha_limite, COALESCE(u.estado_corte, 'en_servicio'), true
    FROM usuarios u
    WHERE u.rol = 'tecnico'
      AND u.coordinador_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM tecnico_detalles td WHERE td.tecnico_id = u.id
      )
    ON CONFLICT (tecnico_id) DO NOTHING;
  END IF;
END $$;

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_estado_corte_check;
ALTER TABLE usuarios DROP COLUMN IF EXISTS coordinador_id;
ALTER TABLE usuarios DROP COLUMN IF EXISTS fecha_limite;
ALTER TABLE usuarios DROP COLUMN IF EXISTS estado_corte;

INSERT INTO configuraciones (clave, valor, descripcion)
VALUES
  ('fecha_corte_global', '{"fecha": null}', 'Fecha de cierre global del programa/ciclo'),
  ('ciclo_nombre', '{"valor": null}', 'Nombre del ciclo activo'),
  ('pdf_encabezado', '{"institucion": "SECRETARÍA DE AGRICULTURA Y DESARROLLO RURAL · HIDALGO", "dependencia": null, "logo_url": null, "pie_pagina": null}', 'Configuracion base de PDFs')
ON CONFLICT (clave) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_correo ON usuarios (correo);
CREATE INDEX IF NOT EXISTS idx_usuarios_login ON usuarios (correo, activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_usuarios_activo_rol ON usuarios (rol, activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_tecnico_detalles_coordinador ON tecnico_detalles (coordinador_id) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_tecnico_detalles_tecnico ON tecnico_detalles (tecnico_id) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_actividades_activo ON actividades (activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_cadenas_activo ON cadenas_productivas (activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_localidades_municipio ON localidades (municipio);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_municipio ON beneficiarios (municipio) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_beneficiarios_nombre_trgm ON beneficiarios USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_municipio_trgm ON beneficiarios USING gin (municipio gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_tecnico_activo ON beneficiarios (tecnico_id, activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_beneficiarios_tecnico_municipio ON beneficiarios (tecnico_id, municipio) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_ben_cadenas_beneficiario ON beneficiario_cadenas (beneficiario_id) WHERE activo = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_asig_beneficiario_unica ON asignaciones_beneficiario (tecnico_id, beneficiario_id) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_asig_beneficiario_tecnico ON asignaciones_beneficiario (tecnico_id) WHERE activo = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_asig_actividad_unica ON asignaciones_actividad (tecnico_id, actividad_id) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_asig_actividad_tecnico ON asignaciones_actividad (tecnico_id) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_bitacoras_fecha ON bitacoras (fecha_inicio DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bitacoras_sync_id ON bitacoras (sync_id) WHERE sync_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bitacoras_tecnico_fecha ON bitacoras (tecnico_id, fecha_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_bitacoras_tecnico_estado ON bitacoras (tecnico_id, estado) WHERE estado <> 'archivado';
CREATE INDEX IF NOT EXISTS idx_bitacoras_reporte ON bitacoras (tecnico_id, fecha_inicio DESC, estado) WHERE estado <> 'archivado';
CREATE INDEX IF NOT EXISTS idx_bitacoras_beneficiario_fecha ON bitacoras (beneficiario_id, fecha_inicio DESC) WHERE beneficiario_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documentos_beneficiario ON documentos (beneficiario_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON documentos (beneficiario_id, tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_pdf_clave_activo ON documentos_pdf (clave, activo);
CREATE INDEX IF NOT EXISTS idx_pdf_versiones_bitacora ON pdf_versiones (bitacora_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_no_leidas ON notificaciones (destino_id, created_at DESC) WHERE leido = false;
CREATE UNIQUE INDEX IF NOT EXISTS idx_archive_logs_periodo ON archive_logs (periodo);
CREATE INDEX IF NOT EXISTS idx_auth_logs_actor_fecha ON auth_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documentos_plantilla_orden ON documentos_plantilla (orden, nombre) WHERE activo = true;
