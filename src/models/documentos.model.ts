import { sql } from "@/db";

export type DocumentoInput = {
  beneficiario_id: string;
  tipo: string;
  nombre_original?: string;
  r2_key: string;
  sha256: string;
  bytes?: number;
  subido_por: string;
};

export async function listDocumentosByBeneficiarioId(beneficiarioId: string) {
  return await sql`
    SELECT id, tipo, nombre_original, r2_key, sha256, bytes, subido_por, created_at
    FROM documentos
    WHERE beneficiario_id = ${beneficiarioId}
    ORDER BY created_at DESC
  `;
}

export async function listDocumentosByBeneficiarioIdAndTipo(beneficiarioId: string, tipo: string) {
  return await sql`
    SELECT id, tipo, nombre_original, r2_key, sha256, bytes, subido_por, created_at
    FROM documentos
    WHERE beneficiario_id = ${beneficiarioId} AND tipo = ${tipo}
    ORDER BY created_at DESC
  `;
}

export async function findDocumentoById(id: string) {
  const [row] = await sql`
    SELECT id, beneficiario_id, tipo, nombre_original, r2_key, sha256, bytes, subido_por, created_at
    FROM documentos
    WHERE id = ${id}
  `;
  return row ?? null;
}

export async function createDocumento(input: DocumentoInput) {
  const [row] = await sql`
    INSERT INTO documentos (beneficiario_id, tipo, nombre_original, r2_key, sha256, bytes, subido_por)
    VALUES (${input.beneficiario_id}, ${input.tipo}, ${input.nombre_original ?? null},
            ${input.r2_key}, ${input.sha256}, ${input.bytes ?? null}, ${input.subido_por})
    RETURNING id, beneficiario_id, tipo, nombre_original, r2_key, sha256, bytes, subido_por, created_at
  `;
  return row;
}

export async function deleteDocumento(id: string) {
  const [row] = await sql`
    DELETE FROM documentos
    WHERE id = ${id}
    RETURNING id, beneficiario_id, tipo, nombre_original
  `;
  return row ?? null;
}
