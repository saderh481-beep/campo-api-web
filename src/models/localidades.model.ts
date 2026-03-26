import { sql } from "@/db";

export type LocalidadInput = {
  zona_id?: string;
  municipio: string;
  nombre: string;
  cp?: string;
};

export type LocalidadUpdateInput = {
  zona_id?: string;
  municipio?: string;
  nombre?: string;
  cp?: string;
};

export async function listLocalidades() {
  return sql`
    SELECT id, zona_id, municipio, nombre, cp, activo, created_at, updated_at
    FROM localidades
    WHERE activo = true
    ORDER BY municipio, nombre
  `;
}

export async function existsZonaActiva(zonaId: string) {
  const [zona] = await sql`SELECT id FROM zonas WHERE id = ${zonaId} AND activo = true`;
  return Boolean(zona);
}

export async function createLocalidad(input: LocalidadInput, userId: string) {
  const [localidad] = await sql`
    INSERT INTO localidades (zona_id, municipio, nombre, cp, created_by)
    VALUES (${input.zona_id ?? null}, ${input.municipio}, ${input.nombre}, ${input.cp ?? null}, ${userId})
    RETURNING id, zona_id, municipio, nombre, cp, activo, created_at, updated_at
  `;
  return localidad;
}

export async function updateLocalidad(id: string, input: LocalidadUpdateInput) {
  const [localidad] = await sql`
    UPDATE localidades SET
      zona_id = COALESCE(${input.zona_id ?? null}, zona_id),
      municipio = COALESCE(${input.municipio ?? null}, municipio),
      nombre = COALESCE(${input.nombre ?? null}, nombre),
      cp = COALESCE(${input.cp ?? null}, cp),
      updated_at = NOW()
    WHERE id = ${id} AND activo = true
    RETURNING id, zona_id, municipio, nombre, cp, activo, created_at, updated_at
  `;
  return localidad ?? null;
}

export async function deactivateLocalidad(id: string) {
  const [localidad] = await sql`
    UPDATE localidades SET activo = false, updated_at = NOW()
    WHERE id = ${id} AND activo = true
    RETURNING id
  `;
  return localidad ?? null;
}

export async function hasBeneficiariosActivosByLocalidadId(localidadId: string) {
  const [row] = await sql`
    SELECT id
    FROM beneficiarios
    WHERE localidad_id = ${localidadId} AND activo = true
    LIMIT 1
  `;
  return Boolean(row);
}