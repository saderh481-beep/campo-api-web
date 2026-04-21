import { sql } from "@/infrastructure/db";
import type { TecnicoDetalle, Tecnico } from "@/domain/entities/tecnico.entity";

export async function findTecnicoDetalleByTecnicoId(tecnicoId: string): Promise<TecnicoDetalle | null> {
  const [row] = await sql`
    SELECT td.id, td.tecnico_id, td.coordinador_id, td.fecha_limite, td.estado_corte, td.activo,
           td.created_at, td.updated_at
    FROM tecnico_detalles td
    WHERE td.tecnico_id = ${tecnicoId}
    LIMIT 1
  `;
  return (row ?? null) as unknown as TecnicoDetalle | null;
}

export async function upsertTecnicoDetalle(tecnico_id: string, coordinador_id: string, fecha_limite: string): Promise<TecnicoDetalle> {
  const [row] = await sql`
    INSERT INTO tecnico_detalles (tecnico_id, coordinador_id, fecha_limite, estado_corte, activo)
    VALUES (${tecnico_id}, ${coordinador_id}, ${fecha_limite}, 'en_servicio', true)
    ON CONFLICT (tecnico_id)
    DO UPDATE SET
      coordinador_id = EXCLUDED.coordinador_id,
      fecha_limite = EXCLUDED.fecha_limite,
      estado_corte = 'en_servicio',
      activo = true,
      updated_at = NOW()
    RETURNING id, tecnico_id, coordinador_id, fecha_limite, estado_corte, activo, created_at, updated_at
  `;
  return row as unknown as TecnicoDetalle;
}

export async function updateTecnicoDetalle(tecnicoId: string, data: { coordinador_id?: string; fecha_limite?: string; estado_corte?: string; activo?: boolean }): Promise<TecnicoDetalle | null> {
  const [row] = await sql`
    UPDATE tecnico_detalles SET
      coordinador_id = COALESCE(${data.coordinador_id ?? null}, coordinador_id),
      fecha_limite = COALESCE(${data.fecha_limite ?? null}, fecha_limite),
      estado_corte = COALESCE(${data.estado_corte ?? null}, estado_corte),
      activo = COALESCE(${data.activo ?? null}, activo),
      updated_at = NOW()
    WHERE tecnico_id = ${tecnicoId}
    RETURNING id, tecnico_id, coordinador_id, fecha_limite, estado_corte, activo, created_at, updated_at
  `;
  return (row ?? null) as unknown as TecnicoDetalle | null;
}

export async function listTecnicosIdsByCoordinadorId(coordinadorId: string): Promise<string[]> {
  const rows = await sql`
    SELECT td.tecnico_id AS id
    FROM tecnico_detalles td
    JOIN usuarios t ON t.id = td.tecnico_id
    WHERE td.coordinador_id = ${coordinadorId} AND td.activo = true AND t.activo = true
  `;
  return rows.map(r => r.id);
}

export async function applyCortesVencidos(): Promise<Tecnico[]> {
  const [config] = await sql`SELECT valor FROM configuraciones WHERE clave = 'fecha_corte_global'`;
  const fechaRaw = (config?.valor as { fecha?: unknown } | null)?.fecha;
  const fechaCorte = typeof fechaRaw === "string" && fechaRaw.trim().length > 0 ? fechaRaw : null;

  if (!fechaCorte) return [];

  const rows = await sql`
    UPDATE tecnico_detalles td
    SET estado_corte = 'suspendido', updated_at = NOW()
    FROM usuarios t
    WHERE td.tecnico_id = t.id
      AND t.rol = 'tecnico'
      AND ${fechaCorte}::timestamptz < NOW()
      AND COALESCE(td.estado_corte, 'en_servicio') = 'en_servicio'
      AND td.activo = true
      AND t.activo = true
    RETURNING t.id, t.nombre, t.correo, ${fechaCorte}::timestamptz AS fecha_corte
  `;
  return rows as unknown as Tecnico[];
}

export async function cerrarCorteById(id: string): Promise<TecnicoDetalle | null> {
  const [row] = await sql`
    UPDATE tecnico_detalles
    SET estado_corte = 'suspendido', updated_at = NOW()
    WHERE tecnico_id = ${id} AND activo = true
    RETURNING id, tecnico_id, coordinador_id, fecha_limite, estado_corte, activo, created_at, updated_at
  `;
  return (row ?? null) as unknown as TecnicoDetalle | null;
}
