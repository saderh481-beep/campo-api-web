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

type AsignacionCoordinadorTecnicoUpdateInput = {
  coordinador_id?: string;
  fecha_limite?: string;
  activo?: boolean;
};

type AsignacionBeneficiarioUpdateInput = {
  tecnico_id?: string;
  beneficiario_id?: string;
  activo?: boolean;
};

type AsignacionActividadUpdateInput = {
  tecnico_id?: string;
  actividad_id?: string;
  activo?: boolean;
};

export async function asignarCoordinadorTecnico(input: TecnicoDetalleInput) {
  const coordinador = await findCoordinadorActivo(input.coordinador_id);
  if (!coordinador) return { status: 400 as const, body: { error: "Coordinador inválido o inactivo" } };

  const tecnico = await findTecnicoActivo(input.tecnico_id);
  if (!tecnico) return { status: 400 as const, body: { error: "Técnico inválido o inactivo" } };

  const row = await upsertTecnicoDetalle(input);
  return { status: 201 as const, body: row };
}

export async function listarAsignacionesCoordinadorTecnico(tecnicoId?: string) {
  return tecnicoId
    ? sql`
        SELECT td.id, td.tecnico_id, td.coordinador_id, td.fecha_limite, td.estado_corte, td.activo,
               td.created_at, td.updated_at, u.nombre AS coordinador_nombre
        FROM tecnico_detalles td
        LEFT JOIN usuarios u ON u.id = td.coordinador_id
        WHERE td.tecnico_id = ${tecnicoId}
      `
    : sql`
        SELECT td.id, td.tecnico_id, td.coordinador_id, td.fecha_limite, td.estado_corte, td.activo,
               td.created_at, td.updated_at, u.nombre AS coordinador_nombre
        FROM tecnico_detalles td
        LEFT JOIN usuarios u ON u.id = td.coordinador_id
        ORDER BY td.created_at DESC
      `;
}

export async function editarAsignacionCoordinadorTecnico(tecnicoId: string, input: AsignacionCoordinadorTecnicoUpdateInput) {
  const actual = await findTecnicoDetalleByTecnicoId(tecnicoId);
  if (!actual) return { status: 404 as const, body: { error: "Asignación no encontrada" } };

  if (input.coordinador_id) {
    const coordinador = await findCoordinadorActivo(input.coordinador_id);
    if (!coordinador) return { status: 400 as const, body: { error: "Coordinador inválido o inactivo" } };
  }

  const nextActivo = input.activo ?? actual.activo;
  const nextEstado = nextActivo ? "en_servicio" : "baja";
  const row = await updateTecnicoDetalle(tecnicoId, {
    coordinador_id: input.coordinador_id,
    fecha_limite: input.fecha_limite,
    activo: input.activo,
    estado_corte: nextEstado,
  });

  return { status: 200 as const, body: row };
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

export async function listarAsignacionesBeneficiario(filters: { tecnico_id?: string; beneficiario_id?: string; activo?: boolean }) {
  return sql`
    SELECT id, tecnico_id, beneficiario_id, activo, asignado_por, asignado_en, removido_en
    FROM asignaciones_beneficiario
    WHERE (${filters.tecnico_id ?? null}::uuid IS NULL OR tecnico_id = ${filters.tecnico_id ?? null}::uuid)
      AND (${filters.beneficiario_id ?? null}::uuid IS NULL OR beneficiario_id = ${filters.beneficiario_id ?? null}::uuid)
      AND (${typeof filters.activo === "boolean" ? filters.activo : null}::boolean IS NULL OR activo = ${typeof filters.activo === "boolean" ? filters.activo : null}::boolean)
    ORDER BY asignado_en DESC
  `;
}

export async function obtenerAsignacionBeneficiario(id: string) {
  const [row] = await sql`
    SELECT id, tecnico_id, beneficiario_id, activo, asignado_por, asignado_en, removido_en
    FROM asignaciones_beneficiario
    WHERE id = ${id}
  `;
  return row ?? null;
}

export async function editarAsignacionBeneficiario(id: string, input: AsignacionBeneficiarioUpdateInput) {
  if (input.tecnico_id) {
    const tecnico = await findTecnicoActivo(input.tecnico_id);
    if (!tecnico) return { status: 400 as const, body: { error: "Técnico inválido o inactivo" } };
  }

  if (input.beneficiario_id) {
    const [beneficiario] = await sql`SELECT id FROM beneficiarios WHERE id = ${input.beneficiario_id} AND activo = true`;
    if (!beneficiario) return { status: 404 as const, body: { error: "Beneficiario no encontrado" } };
  }

  const activeProvided = typeof input.activo === "boolean";
  const [row] = await sql`
    UPDATE asignaciones_beneficiario
    SET tecnico_id = COALESCE(${input.tecnico_id ?? null}, tecnico_id),
        beneficiario_id = COALESCE(${input.beneficiario_id ?? null}, beneficiario_id),
        activo = COALESCE(${input.activo ?? null}, activo),
        removido_en = CASE
          WHEN ${activeProvided} = false THEN removido_en
          WHEN ${input.activo ?? null} = true THEN NULL
          ELSE NOW()
        END
    WHERE id = ${id}
    RETURNING id, tecnico_id, beneficiario_id, activo, asignado_por, asignado_en, removido_en
  `;

  if (!row) return { status: 404 as const, body: { error: "Asignación no encontrada" } };
  return { status: 200 as const, body: row };
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

export async function listarAsignacionesActividad(filters: { tecnico_id?: string; actividad_id?: string; activo?: boolean }) {
  return sql`
    SELECT id, tecnico_id, actividad_id, activo, asignado_por, asignado_en, removido_en
    FROM asignaciones_actividad
    WHERE (${filters.tecnico_id ?? null}::uuid IS NULL OR tecnico_id = ${filters.tecnico_id ?? null}::uuid)
      AND (${filters.actividad_id ?? null}::uuid IS NULL OR actividad_id = ${filters.actividad_id ?? null}::uuid)
      AND (${typeof filters.activo === "boolean" ? filters.activo : null}::boolean IS NULL OR activo = ${typeof filters.activo === "boolean" ? filters.activo : null}::boolean)
    ORDER BY asignado_en DESC
  `;
}

export async function obtenerAsignacionActividad(id: string) {
  const [row] = await sql`
    SELECT id, tecnico_id, actividad_id, activo, asignado_por, asignado_en, removido_en
    FROM asignaciones_actividad
    WHERE id = ${id}
  `;
  return row ?? null;
}

export async function editarAsignacionActividad(id: string, input: AsignacionActividadUpdateInput) {
  if (input.tecnico_id) {
    const tecnico = await findTecnicoActivo(input.tecnico_id);
    if (!tecnico) return { status: 400 as const, body: { error: "Técnico inválido o inactivo" } };
  }

  if (input.actividad_id) {
    const [actividad] = await sql`SELECT id FROM actividades WHERE id = ${input.actividad_id} AND activo = true`;
    if (!actividad) return { status: 404 as const, body: { error: "Actividad no encontrada" } };
  }

  const activeProvided = typeof input.activo === "boolean";
  const [row] = await sql`
    UPDATE asignaciones_actividad
    SET tecnico_id = COALESCE(${input.tecnico_id ?? null}, tecnico_id),
        actividad_id = COALESCE(${input.actividad_id ?? null}, actividad_id),
        activo = COALESCE(${input.activo ?? null}, activo),
        removido_en = CASE
          WHEN ${activeProvided} = false THEN removido_en
          WHEN ${input.activo ?? null} = true THEN NULL
          ELSE NOW()
        END
    WHERE id = ${id}
    RETURNING id, tecnico_id, actividad_id, activo, asignado_por, asignado_en, removido_en
  `;

  if (!row) return { status: 404 as const, body: { error: "Asignación de actividad no encontrada" } };
  return { status: 200 as const, body: row };
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
