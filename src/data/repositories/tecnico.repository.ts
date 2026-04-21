import { sql } from "@/infrastructure/db";
import type { Tecnico, TecnicoUpdate, AsignacionBeneficiario } from "@/domain/entities/tecnico.entity";

export async function findTecnicoById(id: string): Promise<Tecnico | null> {
  const [row] = await sql`
    SELECT t.id, t.nombre, t.correo, t.telefono, td.coordinador_id, td.fecha_limite,
           td.estado_corte, t.codigo_acceso, t.activo, t.created_at, t.updated_at,
           u.nombre AS coordinador_nombre
    FROM usuarios t
    LEFT JOIN tecnico_detalles td ON td.tecnico_id = t.id AND td.activo = true
    LEFT JOIN usuarios u ON u.id = td.coordinador_id
    WHERE t.id = ${id} AND t.rol = 'tecnico' AND t.activo = true
  `;
  return (row ?? null) as unknown as Tecnico | null;
}

export async function findAllTecnicos(): Promise<Tecnico[]> {
  const rows = await sql`
    SELECT t.id, t.nombre, t.correo, t.telefono, td.coordinador_id, td.fecha_limite,
           td.estado_corte, t.codigo_acceso, t.activo, t.created_at, t.updated_at,
           u.nombre AS coordinador_nombre
    FROM usuarios t
    LEFT JOIN tecnico_detalles td ON td.tecnico_id = t.id AND td.activo = true
    LEFT JOIN usuarios u ON u.id = td.coordinador_id
    WHERE t.rol = 'tecnico' AND t.activo = true
    ORDER BY t.nombre
  `;
  return rows as unknown as Tecnico[];
}

export async function findTecnicosByCoordinadorId(coordinadorId: string): Promise<Tecnico[]> {
  const rows = await sql`
    SELECT t.id, t.nombre, t.correo, t.telefono, td.coordinador_id, td.fecha_limite,
           td.estado_corte, t.codigo_acceso, t.activo, t.created_at, t.updated_at,
           u.nombre AS coordinador_nombre
    FROM usuarios t
    JOIN tecnico_detalles td ON td.tecnico_id = t.id AND td.activo = true
    LEFT JOIN usuarios u ON u.id = td.coordinador_id
    WHERE td.coordinador_id = ${coordinadorId} AND t.rol = 'tecnico' AND t.activo = true
    ORDER BY t.nombre
  `;
  return rows as unknown as Tecnico[];
}

export async function existsCorreoEnUsuarioActivo(correo: string, exceptCorreo?: string): Promise<boolean> {
  const [row] = exceptCorreo
    ? await sql`SELECT id FROM usuarios WHERE correo = ${correo} AND correo <> ${exceptCorreo} AND activo = true`
    : await sql`SELECT id FROM usuarios WHERE correo = ${correo} AND activo = true`;
  return Boolean(row);
}

export async function isCoordinadorActivo(id: string): Promise<boolean> {
  const [row] = await sql`SELECT id FROM usuarios WHERE id = ${id} AND rol = 'coordinador' AND activo = true`;
  return Boolean(row);
}

export async function updateTecnico(id: string, body: TecnicoUpdate): Promise<Tecnico | null> {
  const [row] = await sql`
    UPDATE usuarios SET
      nombre = COALESCE(${body.nombre ?? null}, nombre),
      correo = COALESCE(${body.correo ?? null}, correo),
      telefono = COALESCE(${body.telefono ?? null}, telefono),
      updated_at = NOW()
    WHERE id = ${id} AND rol = 'tecnico'
    RETURNING id, nombre, correo, telefono, activo, created_at, updated_at
  `;
  return (row ?? null) as unknown as Tecnico | null;
}

export async function updateTecnicoCodigo(id: string, codigo: string, hashCodigo: string): Promise<void> {
  await sql`
    UPDATE usuarios
    SET codigo_acceso = ${codigo}, hash_codigo_acceso = ${hashCodigo}, updated_at = NOW()
    WHERE id = ${id} AND rol = 'tecnico' AND activo = true
  `;
}

export async function deactivateTecnico(id: string): Promise<void> {
  await sql`
    UPDATE tecnico_detalles SET activo = false, estado_corte = 'baja', updated_at = NOW()
    WHERE tecnico_id = ${id} AND activo = true
  `;
  await sql`
    UPDATE usuarios
    SET activo = false, updated_at = NOW(), codigo_acceso = NULL, hash_codigo_acceso = NULL
    WHERE id = ${id} AND rol = 'tecnico'
  `;
}

export async function listAsignacionesByTecnicoId(id: string): Promise<AsignacionBeneficiario[]> {
  const rows = await sql`
    SELECT ab.id, b.nombre AS beneficiario, ab.activo
    FROM asignaciones_beneficiario ab
    JOIN beneficiarios b ON b.id = ab.beneficiario_id
    WHERE ab.tecnico_id = ${id} AND ab.activo = true
  `;
  return rows as unknown as AsignacionBeneficiario[];
}
