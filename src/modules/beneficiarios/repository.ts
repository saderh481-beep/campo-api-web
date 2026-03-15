import { sql } from "@/config/db";
import { paginate, paginationOffset } from "@/lib/pagination";
import type { Beneficiario } from "@/types";

export async function findAll(params: {
  page: number; pageSize: number;
  tecnicoId?: string; q?: string; activo?: boolean;
}) {
  const { limit, offset } = paginationOffset(params.page, params.pageSize);

  const rows = await sql<Beneficiario[]>`
    SELECT b.*, t.nombre AS tecnico_nombre,
           ARRAY_AGG(cp.nombre) FILTER (WHERE cp.id IS NOT NULL) AS cadenas
    FROM beneficiarios b
    JOIN tecnicos t ON t.id = b.tecnico_id
    LEFT JOIN beneficiario_cadenas bc ON bc.beneficiario_id = b.id
    LEFT JOIN cadenas_productivas cp  ON cp.id = bc.cadena_productiva_id
    WHERE TRUE
      ${params.tecnicoId ? sql`AND b.tecnico_id = ${params.tecnicoId}` : sql``}
      ${params.activo !== undefined ? sql`AND b.activo = ${params.activo}` : sql``}
      ${params.q ? sql`AND b.nombre % ${params.q}` : sql``}
    GROUP BY b.id, t.nombre
    ORDER BY b.nombre ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [{ count }] = await sql<[{ count: number }]>`
    SELECT COUNT(DISTINCT b.id)::int AS count FROM beneficiarios b
    WHERE TRUE
      ${params.tecnicoId ? sql`AND b.tecnico_id = ${params.tecnicoId}` : sql``}
      ${params.activo !== undefined ? sql`AND b.activo = ${params.activo}` : sql``}
      ${params.q ? sql`AND b.nombre % ${params.q}` : sql``}
  `;

  return paginate(rows, count, params.page, params.pageSize);
}

export async function findById(id: string) {
  const [row] = await sql`
    SELECT b.*, t.nombre AS tecnico_nombre,
           COALESCE(
             JSON_AGG(
               JSON_BUILD_OBJECT('id', cp.id, 'nombre', cp.nombre)
             ) FILTER (WHERE cp.id IS NOT NULL),
             '[]'
           ) AS cadenas
    FROM beneficiarios b
    JOIN tecnicos t ON t.id = b.tecnico_id
    LEFT JOIN beneficiario_cadenas bc ON bc.beneficiario_id = b.id
    LEFT JOIN cadenas_productivas cp  ON cp.id = bc.cadena_productiva_id
    WHERE b.id = ${id}
    GROUP BY b.id, t.nombre
  `;
  return row ?? null;
}

export async function create(data: {
  tecnicoId: string; nombre: string;
  curp?: string; telefono?: string; municipio?: string; localidad?: string;
  cadenas: string[];
}) {
  return sql.begin(async (tx) => {
    const [beneficiario] = await tx`
      INSERT INTO beneficiarios (tecnico_id, nombre, curp, telefono, municipio, localidad)
      VALUES (${data.tecnicoId}, ${data.nombre}, ${data.curp ?? null},
              ${data.telefono ?? null}, ${data.municipio ?? null}, ${data.localidad ?? null})
      RETURNING *
    `;

    // Insertar relaciones N:M con cadenas
    if (data.cadenas.length > 0) {
      await tx`
        INSERT INTO beneficiario_cadenas (beneficiario_id, cadena_productiva_id)
        SELECT ${beneficiario.id}, UNNEST(${data.cadenas}::uuid[])
      `;
    }

    return beneficiario;
  });
}

export async function update(
  id: string,
  data: Partial<{
    nombre: string; curp: string | null; telefono: string | null;
    municipio: string | null; localidad: string | null; activo: boolean;
  }>
) {
  const [row] = await sql`
    UPDATE beneficiarios SET
      nombre    = COALESCE(${data.nombre    ?? null}, nombre),
      curp      = COALESCE(${data.curp      ?? null}, curp),
      telefono  = COALESCE(${data.telefono  ?? null}, telefono),
      municipio = COALESCE(${data.municipio ?? null}, municipio),
      localidad = COALESCE(${data.localidad ?? null}, localidad),
      activo    = COALESCE(${data.activo    ?? null}, activo)
    WHERE id = ${id} RETURNING *
  `;
  return row ?? null;
}
