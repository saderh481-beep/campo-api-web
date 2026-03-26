import { sql } from "@/db";

export type DocumentoPlantillaInput = {
  nombre: string;
  descripcion?: string;
  obligatorio: boolean;
  orden: number;
  configuracion?: Record<string, unknown>;
};

export type DocumentoPlantillaUpdateInput = {
  nombre?: string;
  descripcion?: string;
  obligatorio?: boolean;
  orden?: number;
  configuracion?: Record<string, unknown>;
};

export async function listDocumentosPlantilla(includeInactive = false) {
  if (includeInactive) {
    return sql`
      SELECT id, nombre, descripcion, obligatorio, orden, configuracion, activo, created_at, updated_at
      FROM documentos_plantilla
      ORDER BY orden, nombre
    `;
  }

  return sql`
    SELECT id, nombre, descripcion, obligatorio, orden, configuracion
    FROM documentos_plantilla
    WHERE activo = true
    ORDER BY orden, nombre
  `;
}

export async function createDocumentoPlantilla(input: DocumentoPlantillaInput, userId: string) {
  const [documento] = await sql`
    INSERT INTO documentos_plantilla (nombre, descripcion, obligatorio, orden, configuracion, created_by)
    VALUES (
      ${input.nombre},
      ${input.descripcion ?? null},
      ${input.obligatorio},
      ${input.orden},
      ${input.configuracion ? JSON.stringify(input.configuracion) : null}::jsonb,
      ${userId}
    )
    RETURNING id, nombre, descripcion, obligatorio, orden, configuracion, activo, created_at, updated_at
  `;
  return documento;
}

export async function updateDocumentoPlantilla(id: string, input: DocumentoPlantillaUpdateInput) {
  const [documento] = await sql`
    UPDATE documentos_plantilla SET
      nombre = COALESCE(${input.nombre ?? null}, nombre),
      descripcion = COALESCE(${input.descripcion ?? null}, descripcion),
      obligatorio = COALESCE(${input.obligatorio ?? null}, obligatorio),
      orden = COALESCE(${input.orden ?? null}, orden),
      configuracion = COALESCE(${input.configuracion ? JSON.stringify(input.configuracion) : null}::jsonb, configuracion),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, nombre, descripcion, obligatorio, orden, configuracion, activo, created_at, updated_at
  `;
  return documento ?? null;
}

export async function deactivateDocumentoPlantilla(id: string) {
  const [documento] = await sql`
    UPDATE documentos_plantilla SET activo = false, updated_at = NOW()
    WHERE id = ${id} AND activo = true
    RETURNING id
  `;
  return documento ?? null;
}