import { sql } from "@/config/db";
import { paginate, paginationOffset } from "@/lib/pagination";
import type { Usuario } from "@/types";

export async function findAll(params: {
  page: number; pageSize: number;
  rol?: string; activo?: boolean; q?: string;
}) {
  const { limit, offset } = paginationOffset(params.page, params.pageSize);

  const rows = await sql<Usuario[]>`
    SELECT id, nombre, correo, rol, coordinador_id, activo, creado_en
    FROM usuarios
    WHERE TRUE
      ${params.rol    ? sql`AND rol = ${params.rol}`       : sql``}
      ${params.activo !== undefined ? sql`AND activo = ${params.activo}` : sql``}
      ${params.q      ? sql`AND (nombre ILIKE ${"%" + params.q + "%"} OR correo ILIKE ${"%" + params.q + "%"})` : sql``}
    ORDER BY nombre ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [{ count }] = await sql<[{ count: number }]>`
    SELECT COUNT(*)::int AS count FROM usuarios
    WHERE TRUE
      ${params.rol    ? sql`AND rol = ${params.rol}`       : sql``}
      ${params.activo !== undefined ? sql`AND activo = ${params.activo}` : sql``}
      ${params.q      ? sql`AND (nombre ILIKE ${"%" + params.q + "%"} OR correo ILIKE ${"%" + params.q + "%"})` : sql``}
  `;

  return paginate(rows, count, params.page, params.pageSize);
}

export async function findById(id: string): Promise<Usuario | null> {
  const [row] = await sql<Usuario[]>`
    SELECT id, nombre, correo, rol, coordinador_id, activo, creado_en
    FROM usuarios WHERE id = ${id}
  `;
  return row ?? null;
}

export async function create(data: {
  nombre: string; correo: string;
  rol: string; coordinadorId?: string;
}): Promise<Usuario> {
  const [row] = await sql<Usuario[]>`
    INSERT INTO usuarios (nombre, correo, rol, coordinador_id)
    VALUES (${data.nombre}, ${data.correo}, ${data.rol}, ${data.coordinadorId ?? null})
    RETURNING id, nombre, correo, rol, coordinador_id, activo, creado_en
  `;
  return row;
}

export async function update(id: string, data: Partial<{
  nombre: string; rol: string; coordinadorId: string | null; activo: boolean;
}>): Promise<Usuario | null> {
  const [row] = await sql<Usuario[]>`
    UPDATE usuarios SET
      nombre         = COALESCE(${data.nombre         ?? null}, nombre),
      rol            = COALESCE(${data.rol            ?? null}, rol),
      coordinador_id = COALESCE(${data.coordinadorId  ?? null}, coordinador_id),
      activo         = COALESCE(${data.activo         ?? null}, activo)
    WHERE id = ${id}
    RETURNING id, nombre, correo, rol, coordinador_id, activo, creado_en
  `;
  return row ?? null;
}
