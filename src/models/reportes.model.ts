import { sql } from "@/db";

export async function getReporteMensualAdmin(mes: number, anio: number) {
  return sql`
    SELECT t.nombre AS tecnico,
           COUNT(*) FILTER (WHERE b.estado = 'cerrada') AS cerradas,
           COUNT(*) FILTER (WHERE b.estado = 'borrador') AS borradores,
           COUNT(*) AS total
    FROM bitacoras b
    JOIN usuarios t ON t.id = b.tecnico_id AND t.rol = 'tecnico' AND t.activo = true
    WHERE EXTRACT(MONTH FROM b.fecha_inicio) = ${mes}
      AND EXTRACT(YEAR FROM b.fecha_inicio) = ${anio}
    GROUP BY t.nombre
    ORDER BY t.nombre
  `;
}

export async function getReporteMensualCoordinador(coordinadorId: string, mes: number, anio: number) {
  return sql`
    SELECT t.nombre AS tecnico,
           COUNT(*) FILTER (WHERE b.estado = 'cerrada') AS cerradas,
           COUNT(*) FILTER (WHERE b.estado = 'borrador') AS borradores,
           COUNT(*) AS total
    FROM bitacoras b
    JOIN usuarios t ON t.id = b.tecnico_id AND t.rol = 'tecnico' AND t.activo = true
    JOIN tecnico_detalles td ON td.tecnico_id = t.id AND td.activo = true
    WHERE td.coordinador_id = ${coordinadorId}
      AND EXTRACT(MONTH FROM b.fecha_inicio) = ${mes}
      AND EXTRACT(YEAR FROM b.fecha_inicio) = ${anio}
    GROUP BY t.nombre
    ORDER BY t.nombre
  `;
}

export async function canAccessTecnicoReporte(rol: string, tecnicoId: string, coordinadorId: string) {
  const [row] = rol === "administrador"
    ? await sql`SELECT id FROM usuarios WHERE id = ${tecnicoId} AND rol = 'tecnico' AND activo = true`
    : await sql`
        SELECT t.id FROM usuarios t
        JOIN tecnico_detalles td ON td.tecnico_id = t.id AND td.activo = true
        WHERE t.id = ${tecnicoId} AND t.rol = 'tecnico' AND td.coordinador_id = ${coordinadorId} AND t.activo = true
      `;
  return Boolean(row);
}

export async function getBitacorasPorTecnico(tecnicoId: string, desde?: string, hasta?: string) {
  return sql`
    SELECT b.id, b.tipo, b.estado, b.fecha_inicio, b.fecha_fin,
           be.nombre AS beneficiario, cp.nombre AS cadena, a.nombre AS actividad
    FROM bitacoras b
    LEFT JOIN beneficiarios be ON be.id = b.beneficiario_id
    LEFT JOIN cadenas_productivas cp ON cp.id = b.cadena_productiva_id
    LEFT JOIN actividades a ON a.id = b.actividad_id
    WHERE b.tecnico_id = ${tecnicoId}
      AND (${desde ?? null}::date IS NULL OR b.fecha_inicio >= ${desde ?? null}::date)
      AND (${hasta ?? null}::date IS NULL OR b.fecha_inicio <= ${hasta ?? null}::date)
    ORDER BY b.fecha_inicio DESC
  `;
}
