import { sql } from "@/db";

export type UsuarioInput = {
  correo: string;
  nombre: string;
  rol: "tecnico" | "coordinador" | "admin";
  telefono?: string | null;
};

export type UsuarioUpdateInput = {
  correo?: string;
  nombre?: string;
  telefono?: string | null;
  rol?: string;
  codigo_acceso?: string;
  activo?: boolean;
};

export async function listUsuarios() {
  return await sql`
    SELECT id, nombre, correo, rol, telefono, activo, created_at
    FROM usuarios
    ORDER BY created_at DESC
  `;
}

export async function findUsuarioById(id: string) {
  const [row] = await sql`
    SELECT id, nombre, correo, rol, telefono, activo, created_at
    FROM usuarios
    WHERE id = ${id}
  `;
  return row ?? null;
}

export async function existsUsuarioByCorreo(correo: string, exceptId?: string) {
  const [row] = exceptId
    ? await sql`SELECT id FROM usuarios WHERE correo = ${correo} AND id <> ${exceptId}`
    : await sql`SELECT id FROM usuarios WHERE correo = ${correo}`;
  return Boolean(row);
}

export async function existsUsuarioByCodigo(codigo: string) {
  const [row] = await sql`SELECT id FROM usuarios WHERE codigo_acceso = ${codigo} LIMIT 1`;
  return Boolean(row);
}

export async function createUsuario(input: UsuarioInput & { codigo_acceso: string; hash_codigo_acceso: string }) {
  const telefonoValue = input.telefono ?? null;
  const [row] = await sql`
    INSERT INTO usuarios (correo, nombre, rol, telefono, codigo_acceso, hash_codigo_acceso)
    VALUES (${input.correo}, ${input.nombre}, ${input.rol}, ${telefonoValue}, ${input.codigo_acceso}, ${input.hash_codigo_acceso})
    RETURNING id, nombre, correo, codigo_acceso, hash_codigo_acceso
  `;
  return row;
}

export async function updateUsuario(id: string, input: UsuarioUpdateInput & { hash_codigo_acceso?: string | null }) {
  const [row] = await sql`
    UPDATE usuarios SET
      nombre = COALESCE(${input.nombre ?? null}, nombre),
      correo = COALESCE(${input.correo ?? null}, correo),
      telefono = COALESCE(${input.telefono ?? null}, telefono),
      rol = COALESCE(${input.rol ?? null}, rol),
      activo = COALESCE(${input.activo ?? null}, activo),
      codigo_acceso = COALESCE(${input.codigo_acceso ?? null}, codigo_acceso),
      hash_codigo_acceso = COALESCE(${input.hash_codigo_acceso ?? null}, hash_codigo_acceso),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, nombre, correo, rol, telefono, activo, created_at
  `;
  return row ?? null;
}

export async function deactivateUsuario(id: string) {
  const [row] = await sql`
    UPDATE usuarios
    SET activo = false, updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, nombre, correo, codigo_acceso, hash_codigo_acceso
  `;
  return row ?? null;
}

export async function deleteUsuarioFisico(id: string) {
  await sql`
    DELETE FROM tecnico_detalles WHERE coordinador_id = ${id} OR tecnico_id = ${id}
  `;
  await sql`
    DELETE FROM asignaciones_actividad WHERE tecnico_id = ${id}
  `;
  const [row] = await sql`
    DELETE FROM usuarios
    WHERE id = ${id}
    RETURNING id, nombre, correo
  `;
  return row ?? null;
}

export async function findCoordinadorActivo(id: string) {
  const [row] = await sql`
    SELECT id FROM usuarios WHERE id = ${id} AND rol = 'coordinador'
  `;
  return row ?? null;
}

export async function findTecnicoActivo(id: string) {
  const [row] = await sql`
    SELECT id FROM usuarios WHERE id = ${id} AND rol = 'tecnico'
  `;
  return row ?? null;
}
