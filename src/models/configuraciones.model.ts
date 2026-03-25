import { sql } from "@/db";

export async function listConfiguraciones() {
  return sql`
    SELECT clave, valor, descripcion, updated_at
    FROM configuraciones
    ORDER BY clave
  `;
}

export async function findConfiguracionByClave(clave: string) {
  const [config] = await sql`
    SELECT clave, valor, descripcion, updated_at
    FROM configuraciones
    WHERE clave = ${clave}
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
    RETURNING clave, valor, descripcion, updated_at
  `;
  return config;
}