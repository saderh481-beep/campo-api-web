import { sql } from "@/db";

export type ZonaInput = {
  nombre: string;
  descripcion?: string;
};

export type ZonaUpdateInput = {
  nombre?: string;
  descripcion?: string;
};

export async function listZonas() {
  return sql`
    SELECT id, nombre, descripcion, activo, created_at, updated_at
    FROM zonas
    WHERE activo = true
    ORDER BY nombre
  `;
}

export async function createZona(input: ZonaInput, userId: string) {
  const [zona] = await sql`
    INSERT INTO zonas (nombre, descripcion, created_by)
    VALUES (${input.nombre}, ${input.descripcion ?? null}, ${userId})
    RETURNING id, nombre, descripcion, activo, created_at, updated_at
  `;
  return zona;
}

export async function updateZona(id: string, input: ZonaUpdateInput) {
  const [zona] = await sql`
    UPDATE zonas SET
      nombre = COALESCE(${input.nombre ?? null}, nombre),
      descripcion = COALESCE(${input.descripcion ?? null}, descripcion),
      updated_at = NOW()
    WHERE id = ${id} AND activo = true
    RETURNING id, nombre, descripcion, activo, created_at, updated_at
  `;
  return zona ?? null;
}

export async function deactivateZona(id: string) {
  const [zona] = await sql`
    UPDATE zonas SET activo = false, updated_at = NOW()
    WHERE id = ${id} AND activo = true
    RETURNING id
  `;
  return zona ?? null;
}