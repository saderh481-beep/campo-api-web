import {
  findTecnicoActivo,
  findCoordinadorActivo,
} from "@/models/usuarios.model";
import {
  findTecnicoDetalleByTecnicoId,
  upsertTecnicoDetalle,
  updateTecnicoDetalle,
  type TecnicoDetalleInput,
} from "@/models/tecnico-detalles.model";
import { sql } from "@/db";

export async function asignarCoordinadorTecnico(input: TecnicoDetalleInput) {
  const coordinador = await findCoordinadorActivo(input.coordinador_id);
  if (!coordinador) return { status: 400 as const, body: { error: "Coordinador inválido o inactivo" } };

  const tecnico = await findTecnicoActivo(input.tecnico_id);
  if (!tecnico) return { status: 400 as const, body: { error: "Técnico inválido o inactivo" } };

  const row = await upsertTecnicoDetalle(input);
  return { status: 201 as const, body: row };
}

export async function removerAsignacionCoordinadorTecnico(tecnicoId: string) {
  const detalle = await updateTecnicoDetalle(tecnicoId, { activo: false, estado_corte: "baja" });
  if (!detalle) return { status: 404 as const, body: { error: "Asignación no encontrada" } };
  return { status: 200 as const, body: { message: "Asignación removida" } };
}

export async function asignarBeneficiario(tecnicoId: string, beneficiarioId: string, actorId: string) {
  const tecnico = await findTecnicoActivo(tecnicoId);
  if (!tecnico) return { status: 400 as const, body: { error: "Técnico inválido o inactivo" } };

  const [beneficiario] = await sql`SELECT id FROM beneficiarios WHERE id = ${beneficiarioId} AND activo = true`;
  if (!beneficiario) return { status: 404 as const, body: { error: "Beneficiario no encontrado" } };

  const [existente] = await sql`
    SELECT id FROM asignaciones_beneficiario
    WHERE tecnico_id = ${tecnicoId} AND beneficiario_id = ${beneficiarioId}
    ORDER BY asignado_en DESC
    LIMIT 1
  `;

  const [row] = existente
    ? await sql`
        UPDATE asignaciones_beneficiario
        SET activo = true, removido_en = NULL
        WHERE id = ${existente.id}
        RETURNING id, tecnico_id, beneficiario_id, activo, asignado_por, asignado_en, removido_en
      `
    : await sql`
        INSERT INTO asignaciones_beneficiario (tecnico_id, beneficiario_id, asignado_por)
        VALUES (${tecnicoId}, ${beneficiarioId}, ${actorId})
        RETURNING id, tecnico_id, beneficiario_id, activo, asignado_por, asignado_en, removido_en
      `;

  return { status: 201 as const, body: row };
}

export async function removerAsignacionBeneficiario(id: string) {
  const [row] = await sql`
    UPDATE asignaciones_beneficiario
    SET activo = false, removido_en = NOW()
    WHERE id = ${id}
    RETURNING id
  `;
  return row ?? null;
}

export async function asignarActividad(tecnicoId: string, actividadId: string, actorId: string) {
  const tecnico = await findTecnicoActivo(tecnicoId);
  if (!tecnico) return { status: 400 as const, body: { error: "Técnico inválido o inactivo" } };

  const [actividad] = await sql`SELECT id FROM actividades WHERE id = ${actividadId} AND activo = true`;
  if (!actividad) return { status: 404 as const, body: { error: "Actividad no encontrada" } };

  const [existente] = await sql`
    SELECT id FROM asignaciones_actividad
    WHERE tecnico_id = ${tecnicoId} AND actividad_id = ${actividadId}
    ORDER BY asignado_en DESC
    LIMIT 1
  `;

  const [row] = existente
    ? await sql`
        UPDATE asignaciones_actividad
        SET activo = true, removido_en = NULL
        WHERE id = ${existente.id}
        RETURNING id, tecnico_id, actividad_id, activo, asignado_por, asignado_en, removido_en
      `
    : await sql`
        INSERT INTO asignaciones_actividad (tecnico_id, actividad_id, asignado_por)
        VALUES (${tecnicoId}, ${actividadId}, ${actorId})
        RETURNING id, tecnico_id, actividad_id, activo, asignado_por, asignado_en, removido_en
      `;

  return { status: 201 as const, body: row };
}

export async function removerAsignacionActividad(id: string) {
  const [row] = await sql`
    UPDATE asignaciones_actividad
    SET activo = false, removido_en = NOW()
    WHERE id = ${id}
    RETURNING id
  `;
  return row ?? null;
}

export async function obtenerAsignacionCoordinadorTecnico(tecnicoId: string) {
  return findTecnicoDetalleByTecnicoId(tecnicoId);
}
