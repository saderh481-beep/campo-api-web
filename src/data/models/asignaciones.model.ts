import { sql } from "@/infrastructure/db";
import type { TecnicoDetalleInput } from "./tecnico-detalles.model";

export async function listAsignacionesCoordinadorTecnico(tecnicoId?: string) {
  if (tecnicoId) {
    return await sql`
      SELECT td.tecnico_id AS id, td.coordinador_id, td.fecha_limite, td.estado_corte, t.nombre AS tecnico_nombre, c.nombre AS coordinador_nombre
      FROM tecnico_detalles td
      JOIN usuarios t ON t.id = td.tecnico_id
      LEFT JOIN usuarios c ON c.id = td.coordinador_id
      WHERE td.tecnico_id = ${tecnicoId} AND td.activo = true
    `;
  }
  return await sql`
    SELECT td.tecnico_id AS id, td.coordinador_id, td.fecha_limite, td.estado_corte, t.nombre AS tecnico_nombre, c.nombre AS coordinador_nombre
    FROM tecnico_detalles td
    JOIN usuarios t ON t.id = td.tecnico_id
    LEFT JOIN usuarios c ON c.id = td.coordinador_id
    WHERE td.activo = true
  `;
}

export async function getAsignacionCoordinadorTecnicoByTecnicoId(tecnicoId: string) {
  const [row] = await sql`
    SELECT td.tecnico_id AS id, td.coordinador_id, td.fecha_limite, td.estado_corte
    FROM tecnico_detalles td
    WHERE td.tecnico_id = ${tecnicoId} AND td.activo = true
  `;
  return row ?? null;
}

export async function createAsignacionCoordinadorTecnico(input: TecnicoDetalleInput & { fecha_limite: string }) {
  const [row] = await sql`
    INSERT INTO tecnico_detalles (tecnico_id, coordinador_id, fecha_limite, activo)
    VALUES (${input.tecnico_id}, ${input.coordinador_id}, ${input.fecha_limite}, true)
    ON CONFLICT (tecnico_id) DO UPDATE SET coordinador_id = ${input.coordinador_id}, fecha_limite = ${input.fecha_limite}, activo = true, updated_at = NOW()
    RETURNING tecnico_id AS id, coordinador_id, fecha_limite, estado_corte
  `;
  return row;
}

export async function updateAsignacionCoordinadorTecnico(tecnicoId: string, input: Partial<TecnicoDetalleInput & { fecha_limite: string; activo: boolean }>) {
  const [row] = await sql`
    UPDATE tecnico_detalles SET
      coordinador_id = COALESCE(${input.coordinador_id ?? null}, coordinador_id),
      fecha_limite = COALESCE(${input.fecha_limite ?? null}, fecha_limite),
      activo = COALESCE(${input.activo ?? null}, activo),
      updated_at = NOW()
    WHERE tecnico_id = ${tecnicoId} AND activo = true
    RETURNING tecnico_id AS id, coordinador_id, fecha_limite, estado_corte
  `;
  return row ?? null;
}

export async function deleteAsignacionCoordinadorTecnico(tecnicoId: string) {
  const [row] = await sql`
    UPDATE tecnico_detalles SET activo = false, updated_at = NOW()
    WHERE tecnico_id = ${tecnicoId}
    RETURNING tecnico_id
  `;
  return row ?? null;
}

export async function listAsignacionesBeneficiario(filters: { tecnico_id?: string; beneficiario_id?: string; activo?: boolean } = {}) {
  let query = sql`
    SELECT ab.id, ab.tecnico_id, ab.beneficiario_id, ab.activo, ab.asignado_en, b.nombre AS beneficiario_nombre, t.nombre AS tecnico_nombre
    FROM asignaciones_beneficiario ab
    JOIN usuarios t ON t.id = ab.tecnico_id
    LEFT JOIN beneficiarios b ON b.id = ab.beneficiario_id
    WHERE 1=1
  `;
  if (filters.tecnico_id) query = sql`${query} AND ab.tecnico_id = ${filters.tecnico_id}`;
  if (filters.beneficiario_id) query = sql`${query} AND ab.beneficiario_id = ${filters.beneficiario_id}`;
  if (filters.activo !== undefined) query = sql`${query} AND ab.activo = ${filters.activo}`;
  return await query;
}

export async function getAsignacionBeneficiarioById(id: string) {
  const [row] = await sql`SELECT * FROM asignaciones_beneficiario WHERE id = ${id}`;
  return row ?? null;
}

export async function createAsignacionBeneficiario(tecnicoId: string, beneficiarioId: string, asignadoPor: string) {
  const [existing] = await sql`
    SELECT id FROM asignaciones_beneficiario 
    WHERE tecnico_id = ${tecnicoId} AND beneficiario_id = ${beneficiarioId}
  `;
  if (existing) {
    const [row] = await sql`
      UPDATE asignaciones_beneficiario SET activo = true, asignado_en = NOW()
      WHERE tecnico_id = ${tecnicoId} AND beneficiario_id = ${beneficiarioId}
      RETURNING id, tecnico_id, beneficiario_id, activo
    `;
    return row;
  }
  const [row] = await sql`
    INSERT INTO asignaciones_beneficiario (tecnico_id, beneficiario_id, asignado_por)
    VALUES (${tecnicoId}, ${beneficiarioId}, ${asignadoPor})
    RETURNING id, tecnico_id, beneficiario_id, activo
  `;
  return row;
}

export async function updateAsignacionBeneficiario(id: string, input: { tecnico_id?: string; beneficiario_id?: string; activo?: boolean }) {
  const [row] = await sql`
    UPDATE asignaciones_beneficiario SET
      tecnico_id = COALESCE(${input.tecnico_id ?? null}, tecnico_id),
      beneficiario_id = COALESCE(${input.beneficiario_id ?? null}, beneficiario_id),
      activo = COALESCE(${input.activo ?? null}, activo)
    WHERE id = ${id}
    RETURNING id, tecnico_id, beneficiario_id, activo
  `;
  return row ?? null;
}

export async function deleteAsignacionBeneficiario(id: string) {
  const [row] = await sql`
    UPDATE asignaciones_beneficiario SET activo = false
    WHERE id = ${id}
    RETURNING id
  `;
  return row ?? null;
}

export async function listAsignacionesActividad(filters: { tecnico_id?: string; actividad_id?: string; activo?: boolean } = {}) {
  let query = sql`
    SELECT aa.id, aa.tecnico_id, aa.actividad_id, aa.activo, aa.asignado_en, a.nombre AS actividad_nombre, t.nombre AS tecnico_nombre
    FROM asignaciones_actividad aa
    JOIN usuarios t ON t.id = aa.tecnico_id
    LEFT JOIN actividades a ON a.id = aa.actividad_id
    WHERE 1=1
  `;
  if (filters.tecnico_id) query = sql`${query} AND aa.tecnico_id = ${filters.tecnico_id}`;
  if (filters.actividad_id) query = sql`${query} AND aa.actividad_id = ${filters.actividad_id}`;
  if (filters.activo !== undefined) query = sql`${query} AND aa.activo = ${filters.activo}`;
  return await query;
}

export async function getAsignacionActividadById(id: string) {
  const [row] = await sql`SELECT * FROM asignaciones_actividad WHERE id = ${id}`;
  return row ?? null;
}

export async function createAsignacionActividad(tecnicoId: string, actividadId: string, asignadoPor: string) {
  const [existing] = await sql`
    SELECT id FROM asignaciones_actividad 
    WHERE tecnico_id = ${tecnicoId} AND actividad_id = ${actividadId}
  `;
  if (existing) {
    const [row] = await sql`
      UPDATE asignaciones_actividad SET activo = true, asignado_en = NOW()
      WHERE tecnico_id = ${tecnicoId} AND actividad_id = ${actividadId}
      RETURNING id, tecnico_id, actividad_id, activo
    `;
    return row;
  }
  const [row] = await sql`
    INSERT INTO asignaciones_actividad (tecnico_id, actividad_id, asignado_por)
    VALUES (${tecnicoId}, ${actividadId}, ${asignadoPor})
    RETURNING id, tecnico_id, actividad_id, activo
  `;
  return row;
}

export async function updateAsignacionActividad(id: string, input: { tecnico_id?: string; actividad_id?: string; activo?: boolean }) {
  const [row] = await sql`
    UPDATE asignaciones_actividad SET
      tecnico_id = COALESCE(${input.tecnico_id ?? null}, tecnico_id),
      actividad_id = COALESCE(${input.actividad_id ?? null}, actividad_id),
      activo = COALESCE(${input.activo ?? null}, activo)
    WHERE id = ${id}
    RETURNING id, tecnico_id, actividad_id, activo
  `;
  return row ?? null;
}

export async function deleteAsignacionActividad(id: string) {
  const [row] = await sql`
    UPDATE asignaciones_actividad SET activo = false
    WHERE id = ${id}
    RETURNING id
  `;
  return row ?? null;
}