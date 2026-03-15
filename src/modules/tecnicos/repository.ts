import { sql } from "@/config/db";
import { paginate, paginationOffset } from "@/lib/pagination";
import type { Tecnico } from "@/types";

export async function findAll(params: {
  page: number; pageSize: number;
  coordinadorId?: string; activo?: boolean; q?: string;
}) {
  const { limit, offset } = paginationOffset(params.page, params.pageSize);

  const rows = await sql<Tecnico[]>`
    SELECT t.id, t.nombre, t.coordinador_id, t.codigo_acceso,
           t.fecha_limite, t.activo, t.creado_en,
           u.nombre AS coordinador_nombre
    FROM tecnicos t
    JOIN usuarios u ON u.id = t.coordinador_id
    WHERE TRUE
      ${params.coordinadorId ? sql`AND t.coordinador_id = ${params.coordinadorId}` : sql``}
      ${params.activo !== undefined ? sql`AND t.activo = ${params.activo}` : sql``}
      ${params.q ? sql`AND t.nombre ILIKE ${"%" + params.q + "%"}` : sql``}
    ORDER BY t.nombre ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [{ count }] = await sql<[{ count: number }]>`
    SELECT COUNT(*)::int AS count FROM tecnicos t
    WHERE TRUE
      ${params.coordinadorId ? sql`AND t.coordinador_id = ${params.coordinadorId}` : sql``}
      ${params.activo !== undefined ? sql`AND t.activo = ${params.activo}` : sql``}
      ${params.q ? sql`AND t.nombre ILIKE ${"%" + params.q + "%"}` : sql``}
  `;

  return paginate(rows, count, params.page, params.pageSize);
}

export async function findById(id: string): Promise<Tecnico | null> {
  const [row] = await sql<Tecnico[]>`
    SELECT t.*, u.nombre AS coordinador_nombre
    FROM tecnicos t
    JOIN usuarios u ON u.id = t.coordinador_id
    WHERE t.id = ${id}
  `;
  return row ?? null;
}

export async function create(data: {
  nombre: string; coordinadorId: string;
  codigoAcceso: string; fechaLimite: string;
}): Promise<Tecnico> {
  const [row] = await sql<Tecnico[]>`
    INSERT INTO tecnicos (nombre, coordinador_id, codigo_acceso, fecha_limite)
    VALUES (${data.nombre}, ${data.coordinadorId}, ${data.codigoAcceso}, ${data.fechaLimite})
    RETURNING *
  `;
  return row;
}

export async function update(
  id: string,
  data: Partial<{ nombre: string; fechaLimite: string; codigoAcceso: string; activo: boolean }>
): Promise<Tecnico | null> {
  const [row] = await sql<Tecnico[]>`
    UPDATE tecnicos SET
      nombre         = COALESCE(${data.nombre        ?? null}, nombre),
      fecha_limite   = COALESCE(${data.fechaLimite   ?? null}, fecha_limite),
      codigo_acceso  = COALESCE(${data.codigoAcceso  ?? null}, codigo_acceso),
      activo         = COALESCE(${data.activo        ?? null}, activo)
    WHERE id = ${id}
    RETURNING *
  `;
  return row ?? null;
}
