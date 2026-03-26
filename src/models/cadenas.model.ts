import { sql } from "@/db";

export type CadenaInput = {
  nombre: string;
  descripcion?: string;
};

export type CadenaUpdateInput = {
  nombre?: string;
  descripcion?: string;
};

export async function listCadenas() {
  return sql`
    SELECT id, nombre, descripcion, activo, created_by, created_at, updated_at
    FROM cadenas_productivas
    WHERE activo = true
    ORDER BY nombre
  `;
}

export async function createCadena(input: CadenaInput, userId: string) {
  const [row] = await sql`
    INSERT INTO cadenas_productivas (nombre, descripcion, created_by)
    VALUES (${input.nombre}, ${input.descripcion ?? null}, ${userId})
    RETURNING id, nombre, descripcion, activo, created_by, created_at, updated_at
  `;
  return row;
}

export async function updateCadena(id: string, input: CadenaUpdateInput) {
  const [row] = await sql`
    UPDATE cadenas_productivas SET
      nombre = COALESCE(${input.nombre ?? null}, nombre),
      descripcion = COALESCE(${input.descripcion ?? null}, descripcion),
      updated_at = NOW()
    WHERE id = ${id} AND activo = true
    RETURNING id, nombre, descripcion, activo, created_by, created_at, updated_at
  `;
  return row ?? null;
}

export async function deactivateCadena(id: string) {
  const [row] = await sql`
    UPDATE cadenas_productivas SET activo = false, updated_at = NOW()
    WHERE id = ${id} AND activo = true
    RETURNING id
  `;
  return row ?? null;
}
