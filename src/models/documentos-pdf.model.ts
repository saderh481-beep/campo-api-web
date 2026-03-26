import { sql } from "@/db";

export type DocumentoPdfUpdateInput = {
  nombre?: string;
  clave?: string;
  descripcion?: string;
  activo?: boolean;
};

export async function listDocumentosPdf() {
  return sql`
    SELECT id, clave, nombre, descripcion, mime_type, bytes, r2_key, sha256, activo, created_by, created_at, updated_at
    FROM documentos_pdf
    WHERE activo = true
    ORDER BY created_at DESC
  `;
}

export async function createDocumentoPdf(input: {
  clave: string;
  nombre: string;
  descripcion?: string;
  mimeType: string;
  bytes: number;
  r2Key: string;
  sha256: string;
  createdBy: string;
}) {
  const [row] = await sql`
    INSERT INTO documentos_pdf (clave, nombre, descripcion, mime_type, bytes, r2_key, sha256, created_by)
    VALUES (${input.clave}, ${input.nombre}, ${input.descripcion ?? null}, ${input.mimeType}, ${input.bytes}, ${input.r2Key}, ${input.sha256}, ${input.createdBy})
    RETURNING id, clave, nombre, descripcion, mime_type, bytes, r2_key, sha256, activo, created_by, created_at, updated_at
  `;
  return row;
}

export async function updateDocumentoPdf(id: string, input: DocumentoPdfUpdateInput) {
  const [row] = await sql`
    UPDATE documentos_pdf SET
      clave = COALESCE(${input.clave ?? null}, clave),
      nombre = COALESCE(${input.nombre ?? null}, nombre),
      descripcion = COALESCE(${input.descripcion ?? null}, descripcion),
      activo = COALESCE(${input.activo ?? null}, activo),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, clave, nombre, descripcion, mime_type, bytes, r2_key, sha256, activo, created_by, created_at, updated_at
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
