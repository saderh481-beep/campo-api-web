import { sql } from "@/config/db";
import { paginate, paginationOffset } from "@/lib/pagination";

export async function findAll(params: {
  page: number; pageSize: number;
  tecnicoId?: string; tipo?: string; estado?: string; mes?: string;
}) {
  const { limit, offset } = paginationOffset(params.page, params.pageSize);
  const mesInicio = params.mes ? `${params.mes}-01` : null;
  const mesFin    = params.mes
    ? new Date(parseInt(params.mes.split("-")[0]), parseInt(params.mes.split("-")[1]), 0)
        .toISOString().split("T")[0]
    : null;

  const rows = await sql`
    SELECT b.*,
           t.nombre  AS tecnico_nombre,
           ben.nombre AS beneficiario_nombre,
           cp.nombre  AS cadena_nombre,
           ac.nombre  AS actividad_nombre,
           (SELECT COUNT(*)::int FROM pdf_versiones pv WHERE pv.bitacora_id = b.id) AS pdf_versiones
    FROM bitacoras b
    JOIN tecnicos t ON t.id = b.tecnico_id
    LEFT JOIN beneficiarios    ben ON ben.id = b.beneficiario_id
    LEFT JOIN cadenas_productivas cp ON cp.id = b.cadena_productiva_id
    LEFT JOIN actividades       ac  ON ac.id  = b.actividad_id
    WHERE TRUE
      ${params.tecnicoId ? sql`AND b.tecnico_id = ${params.tecnicoId}` : sql``}
      ${params.tipo   ? sql`AND b.tipo   = ${params.tipo}`   : sql``}
      ${params.estado ? sql`AND b.estado = ${params.estado}` : sql``}
      ${mesInicio ? sql`AND b.fecha_inicio BETWEEN ${mesInicio} AND ${mesFin}` : sql``}
    ORDER BY b.fecha_inicio DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [{ count }] = await sql<[{ count: number }]>`
    SELECT COUNT(*)::int AS count FROM bitacoras b
    WHERE TRUE
      ${params.tecnicoId ? sql`AND b.tecnico_id = ${params.tecnicoId}` : sql``}
      ${params.tipo   ? sql`AND b.tipo   = ${params.tipo}`   : sql``}
      ${params.estado ? sql`AND b.estado = ${params.estado}` : sql``}
      ${mesInicio ? sql`AND b.fecha_inicio BETWEEN ${mesInicio} AND ${mesFin}` : sql``}
  `;

  return paginate(rows, count, params.page, params.pageSize);
}

export async function findById(id: string) {
  const [row] = await sql`
    SELECT b.*,
           t.nombre   AS tecnico_nombre,
           ben.nombre AS beneficiario_nombre,
           cp.nombre  AS cadena_nombre,
           ac.nombre  AS actividad_nombre,
           COALESCE(
             JSON_AGG(
               JSON_BUILD_OBJECT('version', pv.version, 'url', pv.url, 'creado_en', pv.creado_en)
               ORDER BY pv.version DESC
             ) FILTER (WHERE pv.id IS NOT NULL),
             '[]'
           ) AS pdfs
    FROM bitacoras b
    JOIN tecnicos t ON t.id = b.tecnico_id
    LEFT JOIN beneficiarios    ben ON ben.id = b.beneficiario_id
    LEFT JOIN cadenas_productivas cp ON cp.id = b.cadena_productiva_id
    LEFT JOIN actividades       ac  ON ac.id  = b.actividad_id
    LEFT JOIN pdf_versiones     pv  ON pv.bitacora_id = b.id
    WHERE b.id = ${id}
    GROUP BY b.id, t.nombre, ben.nombre, cp.nombre, ac.nombre
  `;
  return row ?? null;
}

export async function update(id: string, data: Partial<{ notas: string | null }>) {
  const [row] = await sql`
    UPDATE bitacoras SET
      notas = COALESCE(${data.notas ?? null}, notas)
    WHERE id = ${id} AND estado = 'borrador'
    RETURNING *
  `;
  return row ?? null;
}
