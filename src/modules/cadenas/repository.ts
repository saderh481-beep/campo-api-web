import { sql } from "@/config/db";
import { paginate, paginationOffset } from "@/lib/pagination";
import type { CadenaProductiva } from "@/types";

export async function findAll(params: { page: number; pageSize: number; activo?: boolean }) {
  const { limit, offset } = paginationOffset(params.page, params.pageSize);

  const rows = await sql<CadenaProductiva[]>`
    SELECT id, nombre, activo, creado_by, creado_en FROM cadenas_productivas
    WHERE TRUE
      ${params.activo !== undefined ? sql`AND activo = ${params.activo}` : sql``}
    ORDER BY nombre ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [{ count }] = await sql<[{ count: number }]>`
    SELECT COUNT(*)::int AS count FROM cadenas_productivas
    WHERE TRUE
      ${params.activo !== undefined ? sql`AND activo = ${params.activo}` : sql``}
  `;

  return paginate(rows, count, params.page, params.pageSize);
}

export async function findById(id: string) {
  const [row] = await sql<CadenaProductiva[]>`
    SELECT * FROM cadenas_productivas WHERE id = ${id}
  `;
  return row ?? null;
}

export async function create(nombre: string, creadoBy: string) {
  const [row] = await sql<CadenaProductiva[]>`
    INSERT INTO cadenas_productivas (nombre, creado_by)
    VALUES (${nombre}, ${creadoBy})
    RETURNING *
  `;
  return row;
}

export async function update(id: string, data: Partial<{ nombre: string; activo: boolean }>) {
  const [row] = await sql<CadenaProductiva[]>`
    UPDATE cadenas_productivas SET
      nombre = COALESCE(${data.nombre ?? null}, nombre),
      activo = COALESCE(${data.activo ?? null}, activo)
    WHERE id = ${id} RETURNING *
  `;
  return row ?? null;
}
