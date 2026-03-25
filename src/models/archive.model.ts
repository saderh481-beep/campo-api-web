import { sql } from "@/db";

export async function listArchiveLogs() {
  return sql`
    SELECT id, periodo, total_bitacoras, total_fotos, bytes_comprimidos,
           r2_key_staging, sha256_paquete, estado, descargado_en,
           confirmado_en, confirmado_por, created_at
    FROM archive_logs
    ORDER BY created_at DESC
  `;
}

export async function findArchiveDownloadUrlByPeriodo(periodo: string) {
  const [log] = await sql`
    SELECT r2_key_staging
    FROM archive_logs
    WHERE periodo = ${periodo} AND r2_key_staging IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return log;
}

export async function confirmArchiveLog(periodo: string, userId: string) {
  const [log] = await sql`
    UPDATE archive_logs
    SET estado = 'confirmado', confirmado_en = NOW(), confirmado_por = ${userId}
    WHERE id = (
      SELECT id FROM archive_logs
      WHERE periodo = ${periodo}
      ORDER BY created_at DESC
      LIMIT 1
    )
    RETURNING id
  `;
  return log;
}

export async function findGeneratingArchive(periodo: string) {
  const [log] = await sql`
    SELECT id FROM archive_logs WHERE periodo = ${periodo} AND estado = 'generando'
  `;
  return log;
}

export async function createGeneratingArchive(periodo: string) {
  await sql`
    INSERT INTO archive_logs (periodo, estado)
    VALUES (${periodo}, 'generando')
  `;
}