import {
  confirmArchiveLog,
  createGeneratingArchive,
  findArchiveDownloadUrlByPeriodo,
  findGeneratingArchive,
  listArchiveLogs,
} from "@/models/archive.model";

export async function listarArchivos() {
  return listArchiveLogs();
}

export async function obtenerDescargaArchivado(periodo: string) {
  const log = await findArchiveDownloadUrlByPeriodo(periodo);
  if (!log?.r2_key_staging) return { status: 404 as const, body: { error: "Paquete no disponible" } };
  if (!/^https?:\/\//.test(log.r2_key_staging)) {
    return { status: 400 as const, body: { error: "No hay URL de descarga disponible" } };
  }

  const res = await fetch(log.r2_key_staging);
  if (!res.ok) return { status: 502 as const, body: { error: "Error al obtener el archivo" } };

  return {
    status: 200 as const,
    body: res.body,
  };
}

export async function confirmarArchivado(periodo: string, userId: string) {
  const row = await confirmArchiveLog(periodo, userId);
  if (!row) return { status: 404 as const, body: { error: "No se encontró archivado para ese periodo" } };
  return { status: 200 as const, body: { message: `Archivado ${periodo} confirmado` } };
}

export async function forzarArchivado(periodo: string) {
  const existente = await findGeneratingArchive(periodo);
  if (existente) {
    return { status: 409 as const, body: { error: "Ya existe un archivado en progreso para ese periodo" } };
  }

  await createGeneratingArchive(periodo);
  return { status: 200 as const, body: { message: `Archivado de ${periodo} encolado` } };
}