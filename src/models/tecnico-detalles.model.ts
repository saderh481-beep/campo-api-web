import { sql } from "@/db";

export type TecnicoDetalleInput = {
  tecnico_id: string;
  coordinador_id: string;
  fecha_limite: string;
};

export type TecnicoDetalleUpdateInput = {
  coordinador_id?: string;
  fecha_limite?: string;
  estado_corte?: "en_servicio" | "corte_aplicado" | "baja";
  activo?: boolean;
};

export async function findTecnicoDetalleByTecnicoId(tecnicoId: string) {
  const [row] = await sql`
    SELECT td.id, td.tecnico_id, td.coordinador_id, td.fecha_limite, td.estado_corte, td.activo,
           td.created_at, td.updated_at, u.nombre AS coordinador_nombre
    FROM tecnico_detalles td
    JOIN usuarios u ON u.id = td.coordinador_id
    WHERE td.tecnico_id = ${tecnicoId}
    LIMIT 1
  `;
  return row ?? null;
}

export async function upsertTecnicoDetalle(input: TecnicoDetalleInput) {
  const [row] = await sql`
    INSERT INTO tecnico_detalles (tecnico_id, coordinador_id, fecha_limite, estado_corte, activo)
    VALUES (${input.tecnico_id}, ${input.coordinador_id}, ${input.fecha_limite}, 'en_servicio', true)
    ON CONFLICT (tecnico_id)
    DO UPDATE SET
      coordinador_id = EXCLUDED.coordinador_id,
      fecha_limite = EXCLUDED.fecha_limite,
      estado_corte = 'en_servicio',
      activo = true,
      updated_at = NOW()
    RETURNING id, tecnico_id, coordinador_id, fecha_limite, estado_corte, activo, created_at, updated_at
  `;
  return row;
}

export async function updateTecnicoDetalle(tecnicoId: string, input: TecnicoDetalleUpdateInput) {
  const [row] = await sql`
    UPDATE tecnico_detalles SET
      coordinador_id = COALESCE(${input.coordinador_id ?? null}, coordinador_id),
      fecha_limite = COALESCE(${input.fecha_limite ?? null}, fecha_limite),
      estado_corte = COALESCE(${input.estado_corte ?? null}, estado_corte),
      activo = COALESCE(${input.activo ?? null}, activo),
      updated_at = NOW()
    WHERE tecnico_id = ${tecnicoId}
    RETURNING id, tecnico_id, coordinador_id, fecha_limite, estado_corte, activo, created_at, updated_at
  `;
  return row ?? null;
}

export async function listTecnicosIdsByCoordinadorId(coordinadorId: string) {
  return sql`
    SELECT td.tecnico_id AS id
    FROM tecnico_detalles td
    JOIN usuarios t ON t.id = td.tecnico_id
    WHERE td.coordinador_id = ${coordinadorId} AND td.activo = true AND t.activo = true
  `;
}
