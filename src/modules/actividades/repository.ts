import { sql } from "@/config/db";
import { paginate, paginationOffset } from "@/lib/pagination";
import type { Actividad } from "@/types";

export async function findAll(params: { page: number; pageSize: number; activo?: boolean }) {
  const { limit, offset } = paginationOffset(params.page, params.pageSize);

  const rows = await sql<Actividad[]>`
    SELECT id, nombre, descripcion, activo, creado_en FROM actividades
    WHERE TRUE
      ${params.activo !== undefined ? sql`AND activo = ${params.activo}` : sql``}
    ORDER BY nombre ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [{ count }] = await sql<[{ count: number }]>`
    SELECT COUNT(*)::int AS count FROM actividades
    WHERE TRUE
      ${params.activo !== undefined ? sql`AND activo = ${params.activo}` : sql``}
  `;

  return paginate(rows, count, params.page, params.pageSize);
}

export async function findById(id: string) {
  const [row] = await sql<Actividad[]>`SELECT * FROM actividades WHERE id = ${id}`;
  return row ?? null;
}

export async function create(data: { nombre: string; descripcion?: string }) {
  const [row] = await sql<Actividad[]>`
    INSERT INTO actividades (nombre, descripcion)
    VALUES (${data.nombre}, ${data.descripcion ?? null})
    RETURNING *
  `;
  return row;
}

export async function update(
  id: string,
  data: Partial<{ nombre: string; descripcion: string | null; activo: boolean }>
) {
  const [row] = await sql<Actividad[]>`
    UPDATE actividades SET
      nombre      = COALESCE(${data.nombre      ?? null}, nombre),
      descripcion = COALESCE(${data.descripcion ?? null}, descripcion),
      activo      = COALESCE(${data.activo      ?? null}, activo)
    WHERE id = ${id} RETURNING *
  `;
  return row ?? null;
}
