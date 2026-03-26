import { sql } from "@/db";
import { updateTecnicoDetalle } from "@/models/tecnico-detalles.model";

export type TecnicoUpdateInput = {
  nombre?: string;
  correo?: string;
  telefono?: string;
  coordinador_id?: string;
  fecha_limite?: string;
};

export async function listTecnicosByRole(userId: string, rol: string) {
  if (rol === "administrador") {
    return sql`
      SELECT t.id, t.nombre, t.correo, t.telefono, td.coordinador_id, td.fecha_limite,
             td.estado_corte, t.codigo_acceso, t.activo, t.created_at, t.updated_at,
             u.nombre AS coordinador_nombre
      FROM usuarios t
      LEFT JOIN tecnico_detalles td ON td.tecnico_id = t.id AND td.activo = true
      LEFT JOIN usuarios u ON u.id = td.coordinador_id
      WHERE t.rol = 'tecnico' AND t.activo = true
      ORDER BY t.nombre
    `;
  }

  return sql`
    SELECT t.id, t.nombre, t.correo, t.telefono, td.coordinador_id, td.fecha_limite,
           td.estado_corte, t.codigo_acceso, t.activo, t.created_at, t.updated_at,
           u.nombre AS coordinador_nombre
    FROM usuarios t
    JOIN tecnico_detalles td ON td.tecnico_id = t.id AND td.activo = true
    LEFT JOIN usuarios u ON u.id = td.coordinador_id
    WHERE t.rol = 'tecnico' AND td.coordinador_id = ${userId} AND t.activo = true
    ORDER BY t.nombre
  `;
}

export async function findTecnicoById(id: string) {
  const [tecnico] = await sql`
    SELECT t.id, t.nombre, t.correo, t.telefono, td.coordinador_id, td.fecha_limite,
           td.estado_corte, t.codigo_acceso, t.activo, t.created_at, t.updated_at,
           u.nombre AS coordinador_nombre
    FROM usuarios t
    LEFT JOIN tecnico_detalles td ON td.tecnico_id = t.id AND td.activo = true
    LEFT JOIN usuarios u ON u.id = td.coordinador_id
    WHERE t.id = ${id} AND t.rol = 'tecnico' AND t.activo = true
  `;
  return tecnico ?? null;
}

export async function listAsignacionesByTecnicoId(id: string) {
  return sql`
    SELECT ab.id, b.nombre AS beneficiario, ab.activo
    FROM asignaciones_beneficiario ab
    JOIN beneficiarios b ON b.id = ab.beneficiario_id
    WHERE ab.tecnico_id = ${id} AND ab.activo = true
  `;
}

export async function existsCorreoEnUsuarioActivo(correo: string, exceptCorreo?: string) {
  const [row] = exceptCorreo
    ? await sql`
        SELECT id FROM usuarios
        WHERE correo = ${correo} AND correo <> ${exceptCorreo} AND activo = true
      `
    : await sql`
        SELECT id FROM usuarios
        WHERE correo = ${correo} AND activo = true
      `;

  return Boolean(row);
}

export async function isCoordinadorActivo(id: string) {
  const [coordinador] = await sql`
    SELECT id FROM usuarios
    WHERE id = ${id} AND rol = 'coordinador' AND activo = true
  `;
  return Boolean(coordinador);
}

export async function updateTecnico(id: string, body: TecnicoUpdateInput) {
  const [actualizado] = await sql`
    UPDATE usuarios SET
      nombre         = COALESCE(${body.nombre ?? null}, nombre),
      correo         = COALESCE(${body.correo ?? null}, correo),
      telefono       = COALESCE(${body.telefono ?? null}, telefono),
      updated_at     = NOW()
    WHERE id = ${id} AND rol = 'tecnico'
    RETURNING id, nombre, correo, telefono, activo, created_at, updated_at
  `;

  if (body.coordinador_id || body.fecha_limite) {
    await updateTecnicoDetalle(id, {
      coordinador_id: body.coordinador_id,
      fecha_limite: body.fecha_limite,
    });
  }

  return actualizado ?? null;
}

export async function updateTecnicoCodigo(id: string, codigo: string, hashCodigo: string) {
  await sql`
    UPDATE usuarios
    SET codigo_acceso = ${codigo}, hash_codigo_acceso = ${hashCodigo}, updated_at = NOW()
    WHERE id = ${id} AND rol = 'tecnico' AND activo = true
  `;
}

export async function applyCortesVencidos() {
  const [config] = await sql`
    SELECT valor
    FROM configuraciones
    WHERE clave = 'fecha_corte_global'
  `;

  const fechaRaw = (config?.valor as { fecha?: unknown } | null)?.fecha;
  const fechaCorte = typeof fechaRaw === "string" && fechaRaw.trim().length > 0
    ? fechaRaw
    : null;

  if (!fechaCorte) return [];

  return sql`
    UPDATE tecnico_detalles td
    SET estado_corte = 'corte_aplicado',
        updated_at   = NOW()
    FROM usuarios t
    WHERE td.tecnico_id = t.id
      AND t.rol = 'tecnico'
      AND ${fechaCorte}::timestamptz < NOW()
      AND COALESCE(td.estado_corte, 'en_servicio') = 'en_servicio'
      AND td.activo = true
      AND t.activo = true
    RETURNING t.id, t.nombre, t.correo, ${fechaCorte}::timestamptz AS fecha_corte
  `;
}

export async function cerrarCorteById(id: string) {
  const [actualizado] = await sql`
    UPDATE tecnico_detalles
    SET estado_corte = 'corte_aplicado',
        updated_at   = NOW()
    WHERE tecnico_id = ${id} AND activo = true
    RETURNING tecnico_id AS id, estado_corte, fecha_limite
  `;
  return actualizado ?? null;
}

export async function deactivateTecnico(id: string) {
  await updateTecnicoDetalle(id, { activo: false, estado_corte: "baja" });
  const [row] = await sql`
    UPDATE usuarios
    SET activo = false,
        updated_at = NOW(),
        codigo_acceso = NULL,
        hash_codigo_acceso = NULL
    WHERE id = ${id} AND rol = 'tecnico'
    RETURNING id
  `;
  return row ?? null;
}
