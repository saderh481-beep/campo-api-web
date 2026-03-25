import { sql } from "@/db";

export async function getCoordinadorMetricas(coordinadorId: string) {
  const [[tecnicos], [beneficiarios], [bitacoras], resumenTecnicos] = await Promise.all([
    sql`
      SELECT COUNT(*)::int AS total
      FROM tecnico_detalles td
      JOIN usuarios t ON t.id = td.tecnico_id
      WHERE t.rol = 'tecnico' AND td.coordinador_id = ${coordinadorId} AND td.activo = true AND t.activo = true
    `,
    sql`
      SELECT COUNT(DISTINCT b.id)::int AS total
      FROM beneficiarios b
      JOIN tecnico_detalles td ON td.tecnico_id = b.tecnico_id
      JOIN usuarios t ON t.id = b.tecnico_id
      WHERE t.rol = 'tecnico' AND td.coordinador_id = ${coordinadorId} AND td.activo = true AND t.activo = true AND b.activo = true
    `,
    sql`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE estado = 'cerrada')::int AS cerradas,
             COUNT(*) FILTER (WHERE estado = 'borrador')::int AS borradores
      FROM bitacoras b
      JOIN tecnico_detalles td ON td.tecnico_id = b.tecnico_id
      JOIN usuarios t ON t.id = b.tecnico_id
      WHERE t.rol = 'tecnico' AND td.coordinador_id = ${coordinadorId} AND td.activo = true AND t.activo = true
    `,
    sql`
      SELECT t.id, t.nombre, t.correo, t.telefono, td.fecha_limite, td.estado_corte,
             COUNT(DISTINCT b.id)::int AS total_beneficiarios,
             COUNT(DISTINCT bt.id)::int AS total_bitacoras
      FROM usuarios t
      JOIN tecnico_detalles td ON td.tecnico_id = t.id AND td.activo = true
      LEFT JOIN beneficiarios b ON b.tecnico_id = t.id AND b.activo = true
      LEFT JOIN bitacoras bt ON bt.tecnico_id = t.id
      WHERE t.rol = 'tecnico' AND td.coordinador_id = ${coordinadorId} AND t.activo = true
      GROUP BY t.id, t.nombre, t.correo, t.telefono, td.fecha_limite, td.estado_corte
      ORDER BY t.nombre
    `,
  ]);

  return {
    resumen: {
      tecnicos: tecnicos.total,
      beneficiarios: beneficiarios.total,
      bitacoras: bitacoras.total,
      bitacoras_cerradas: bitacoras.cerradas,
      bitacoras_borrador: bitacoras.borradores,
    },
    tecnicos: resumenTecnicos,
  };
}
