import { sql } from "@/db";
import type { Configuracion, ConfiguracionUpdate } from "@/domain/entities/configuracion.entity";

export async function findAllConfiguraciones(): Promise<Configuracion[]> {
  const rows = await sql`
    SELECT clave, valor, descripcion, updated_at
    FROM configuraciones
    ORDER BY clave
  `;
  return rows as unknown as Configuracion[];
}

export async function findConfiguracionByClave(clave: string): Promise<Configuracion | null> {
  const [row] = await sql`
    SELECT clave, valor, descripcion, updated_at
    FROM configuraciones
    WHERE clave = ${clave}
  `;
  return (row ?? null) as Configuracion | null;
}

export async function updateConfiguracion(
  clave: string,
  data: ConfiguracionUpdate,
  userId: string
): Promise<Configuracion | null> {
  const [row] = await sql`
    UPDATE configuraciones SET
      valor = ${JSON.stringify(data.valor)}::jsonb,
      updated_by = ${userId},
      updated_at = NOW()
    WHERE clave = ${clave}
    RETURNING clave, valor, descripcion, updated_at
  `;
  return (row ?? null) as Configuracion | null;
}
