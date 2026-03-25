import {
  canAccessTecnicoReporte,
  getBitacorasPorTecnico,
  getReporteMensualAdmin,
  getReporteMensualCoordinador,
} from "@/models/reportes.model";

export async function obtenerReporteMensual(rol: string, coordinadorId: string, mes: number, anio: number) {
  const tecnicos = rol === "administrador"
    ? await getReporteMensualAdmin(mes, anio)
    : await getReporteMensualCoordinador(coordinadorId, mes, anio);

  return { mes, anio, tecnicos };
}

export async function obtenerReportePorTecnico(rol: string, coordinadorId: string, tecnicoId: string, desde?: string, hasta?: string) {
  const allowed = await canAccessTecnicoReporte(rol, tecnicoId, coordinadorId);
  if (!allowed) {
    return { status: 404 as const, body: { error: "Técnico no encontrado o sin permisos" } };
  }

  const bitacoras = await getBitacorasPorTecnico(tecnicoId, desde, hasta);
  return { status: 200 as const, body: { tecnico_id: tecnicoId, total: bitacoras.length, bitacoras } };
}
