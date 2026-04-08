import { sql } from "@/db";

export type DocumentoPdfInput = {
  clave: string;
  nombre: string;
  descripcion?: string;
  mime_type?: string;
  bytes?: number;
  r2_key: string;
  sha256: string;
};

export type DocumentoPdfUpdateInput = {
  nombre?: string;
  descripcion?: string;
  mime_type?: string;
  bytes?: number;
  r2_key?: string;
  sha256?: string;
  activo?: boolean;
};

export async function listDocumentosPdf(activos?: boolean) {
  if (activos) {
    return await sql`
      SELECT id, clave, nombre, descripcion, mime_type, bytes, sha256, activo, created_at, updated_at
      FROM documentos_pdf
      WHERE activo = true
      ORDER BY clave
    `;
  }
  return await sql`
    SELECT id, clave, nombre, descripcion, mime_type, bytes, sha256, activo, created_at, updated_at
    FROM documentos_pdf
    ORDER BY clave
  `;
}

export async function findDocumentoPdfByClave(clave: string) {
  const [row] = await sql`
    SELECT id, clave, nombre, descripcion, mime_type, bytes, sha256, activo, created_at, updated_at
    FROM documentos_pdf
    WHERE clave = ${clave} AND activo = true
  `;
  return row ?? null;
}

export async function findDocumentoPdfById(id: string) {
  const [row] = await sql`
    SELECT id, clave, nombre, descripcion, mime_type, bytes, sha256, activo, created_at, updated_at
    FROM documentos_pdf
    WHERE id = ${id}
  `;
  return row ?? null;
}

export async function createDocumentoPdf(input: DocumentoPdfInput, userId: string) {
  const descripcionValue = input.descripcion ?? null;
  const bytesValue = input.bytes ?? null;
  const [row] = await sql`
    INSERT INTO documentos_pdf (clave, nombre, descripcion, mime_type, bytes, r2_key, sha256, created_by)
    VALUES (${input.clave}, ${input.nombre}, ${descripcionValue},
            ${input.mime_type ?? 'application/pdf'}, ${bytesValue},
            ${input.r2_key}, ${input.sha256}, ${userId})
    RETURNING id, clave, nombre, descripcion, mime_type, bytes, sha256, activo, created_at, updated_at
  `;
  return row;
}

export async function updateDocumentoPdf(id: string, input: DocumentoPdfUpdateInput) {
  const [row] = await sql`
    UPDATE documentos_pdf SET
      nombre = COALESCE(${input.nombre ?? null}, nombre),
      descripcion = COALESCE(${input.descripcion ?? null}, descripcion),
      mime_type = COALESCE(${input.mime_type ?? null}, mime_type),
      bytes = COALESCE(${input.bytes ?? null}, bytes),
      r2_key = COALESCE(${input.r2_key ?? null}, r2_key),
      sha256 = COALESCE(${input.sha256 ?? null}, sha256),
      activo = COALESCE(${input.activo ?? null}, activo),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, clave, nombre, descripcion, mime_type, bytes, sha256, activo, created_at, updated_at
  `;
  return row ?? null;
}

export async function deactivateDocumentoPdf(id: string) {
  const [row] = await sql`
    UPDATE documentos_pdf SET activo = false, updated_at = NOW()
    WHERE id = ${id} AND activo = true
    RETURNING id
  `;
  return row ?? null;
}
