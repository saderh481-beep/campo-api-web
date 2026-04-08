import { sql } from "@/db";

export type ConfiguracionInput = {
  clave: string;
  valor: Record<string, unknown>;
  descripcion?: string;
};

export type ConfiguracionUpdateInput = {
  valor?: Record<string, unknown>;
  descripcion?: string;
};

export async function listConfiguraciones() {
  return await sql`
    SELECT id, clave, valor, descripcion, updated_by, updated_at
    FROM configuraciones
    ORDER BY clave
  `;
}

export async function findConfiguracionByClave(clave: string) {
  const [config] = await sql`
    SELECT id, clave, valor, descripcion, updated_by, updated_at
    FROM configuraciones
    WHERE clave = ${clave}
  `;
  return config ?? null;
}

export async function createConfiguracion(input: ConfiguracionInput, userId: string) {
  const descripcionValue = input.descripcion ?? null;
  const [config] = await sql`
    INSERT INTO configuraciones (clave, valor, descripcion, updated_by)
    VALUES (${input.clave}, ${JSON.stringify(input.valor)}::jsonb, ${descripcionValue}, ${userId})
    ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, updated_by = EXCLUDED.updated_by, updated_at = NOW()
    RETURNING id, clave, valor, descripcion, updated_by, updated_at
  `;
  return config;
}

export async function updateConfiguracion(clave: string, valor: Record<string, unknown>, userId: string) {
  const [config] = await sql`
    UPDATE configuraciones SET
      valor = ${JSON.stringify(valor)}::jsonb,
      updated_by = ${userId},
      updated_at = NOW()
    WHERE clave = ${clave}
    RETURNING id, clave, valor, descripcion, updated_by, updated_at
  `;
  return config ?? null;
}

export async function upsertConfiguracion(clave: string, valor: Record<string, unknown>, userId: string, descripcion?: string) {
  const descripcionValue = descripcion ?? null;
  const [config] = await sql`
    INSERT INTO configuraciones (clave, valor, descripcion, updated_by)
    VALUES (${clave}, ${JSON.stringify(valor)}::jsonb, ${descripcionValue}, ${userId})
    ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, updated_by = EXCLUDED.updated_by, updated_at = NOW()
    RETURNING id, clave, valor, descripcion, updated_by, updated_at
  `;
  return config;
}

export async function deleteConfiguracion(clave: string) {
  const [config] = await sql`
    DELETE FROM configuraciones
    WHERE clave = ${clave}
    RETURNING clave
  `;
  return config ?? null;
}