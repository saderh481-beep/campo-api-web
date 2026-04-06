import { sql } from "@/db";
import type { Zona, ZonaCreate, ZonaUpdate } from "@/domain/entities/zona.entity";

export async function findAllZonas(): Promise<Zona[]> {
  const rows = await sql`
    SELECT id, nombre, descripcion, activo, created_at, updated_at
    FROM zonas
    WHERE activo = true
    ORDER BY nombre
  `;
  return rows as unknown as Zona[];
}

export async function findZonaById(id: string): Promise<Zona | null> {
  const [row] = await sql`
    SELECT id, nombre, descripcion, activo, created_at, updated_at
    FROM zonas
    WHERE id = ${id} AND activo = true
  `;
  return (row ?? null) as Zona | null;
}

export async function createZona(data: ZonaCreate & { created_by: string }): Promise<Zona> {
  const [row] = await sql`
    INSERT INTO zonas (nombre, descripcion, created_by)
    VALUES (${data.nombre}, ${data.descripcion ?? null}, ${data.created_by})
    RETURNING id, nombre, descripcion, activo, created_at, updated_at
  `;
  return row as Zona;
}

export async function updateZona(id: string, data: ZonaUpdate): Promise<Zona | null> {
  const [row] = await sql`
    UPDATE zonas SET
      nombre = COALESCE(${data.nombre ?? null}, nombre),
      descripcion = COALESCE(${data.descripcion ?? null}, descripcion),
      updated_at = NOW()
    WHERE id = ${id} AND activo = true
    RETURNING id, nombre, descripcion, activo, created_at, updated_at
  `;
  return (row ?? null) as Zona | null;
}

export async function deactivateZona(id: string): Promise<Zona | null> {
  const [row] = await sql`
    UPDATE zonas SET activo = false, updated_at = NOW()
    WHERE id = ${id} AND activo = true
    RETURNING id, nombre, descripcion, activo, created_at, updated_at
  `;
  return (row ?? null) as Zona | null;
}
