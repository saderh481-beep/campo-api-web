import { sql } from "@/db";

export type ActividadInput = {
  nombre: string;
  descripcion?: string;
};

export type ActividadUpdateInput = {
  nombre?: string;
  descripcion?: string;
};

export async function listActividades() {
  return sql`
    SELECT id, nombre, descripcion, activo, created_by, created_at, updated_at
    FROM actividades
    WHERE activo = true
    ORDER BY nombre
  `;
}

export async function createActividad(input: ActividadInput, userId: string) {
  const [row] = await sql`
    INSERT INTO actividades (nombre, descripcion, created_by)
    VALUES (${input.nombre}, ${input.descripcion ?? null}, ${userId})
    RETURNING id, nombre, descripcion, activo, created_by, created_at, updated_at
  `;
  return row;
}

export async function updateActividad(id: string, input: ActividadUpdateInput) {
  const [row] = await sql`
    UPDATE actividades SET
      nombre = COALESCE(${input.nombre ?? null}, nombre),
      descripcion = COALESCE(${input.descripcion ?? null}, descripcion),
      updated_at = NOW()
    WHERE id = ${id} AND activo = true
    RETURNING id, nombre, descripcion, activo, created_by, created_at, updated_at
  `;
  return row ?? null;
}

export async function deactivateActividad(id: string) {
  const [row] = await sql`
    UPDATE actividades SET activo = false, updated_at = NOW()
    WHERE id = ${id} AND activo = true
    RETURNING id
  `;
  return row ?? null;
}
