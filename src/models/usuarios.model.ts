import { sql } from "@/db";

export type UsuarioInput = {
  correo: string;
  nombre: string;
  rol: "tecnico" | "coordinador" | "administrador";
  telefono?: string;
};

export type UsuarioUpdateInput = {
  correo?: string;
  nombre?: string;
  rol?: "tecnico" | "coordinador" | "administrador";
  telefono?: string;
  codigo_acceso?: string;
  activo?: boolean;
};

export async function listUsuarios() {
  return sql`
    SELECT id, nombre, correo, rol, codigo_acceso, telefono, activo, created_at, updated_at
    FROM usuarios
    ORDER BY created_at DESC
  `;
}

export async function findUsuarioById(id: string) {
  const [row] = await sql`
    SELECT id, nombre, correo, rol, codigo_acceso, telefono, activo, created_at, updated_at
    FROM usuarios
    WHERE id = ${id}
  `;
  return row ?? null;
}

export async function existsUsuarioByCorreo(correo: string, exceptId?: string) {
  const [row] = exceptId
    ? await sql`SELECT id FROM usuarios WHERE correo = ${correo} AND id <> ${exceptId} AND activo = true`
    : await sql`SELECT id FROM usuarios WHERE correo = ${correo} AND activo = true`;
  return Boolean(row);
}

export async function existsUsuarioByCodigo(codigo: string) {
  const [row] = await sql`SELECT id FROM usuarios WHERE codigo_acceso = ${codigo} LIMIT 1`;
  return Boolean(row);
}

export async function createUsuario(input: UsuarioInput & { codigo_acceso: string; hash_codigo_acceso: string }) {
  const [row] = await sql`
    INSERT INTO usuarios (correo, nombre, rol, codigo_acceso, hash_codigo_acceso, telefono)
    VALUES (${input.correo}, ${input.nombre}, ${input.rol}, ${input.codigo_acceso}, ${input.hash_codigo_acceso}, ${input.telefono ?? null})
    RETURNING id, nombre, correo, rol, codigo_acceso, telefono, activo, created_at, updated_at
  `;
  return row;
}

export async function updateUsuario(id: string, input: UsuarioUpdateInput & { hash_codigo_acceso?: string | null }) {
  const [row] = await sql`
    UPDATE usuarios SET
      nombre = COALESCE(${input.nombre ?? null}, nombre),
      correo = COALESCE(${input.correo ?? null}, correo),
      rol = COALESCE(${input.rol ?? null}, rol),
      telefono = COALESCE(${input.telefono ?? null}, telefono),
      codigo_acceso = COALESCE(${input.codigo_acceso ?? null}, codigo_acceso),
      hash_codigo_acceso = COALESCE(${input.hash_codigo_acceso ?? null}, hash_codigo_acceso),
      activo = COALESCE(${input.activo ?? null}, activo),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, nombre, correo, rol, codigo_acceso, telefono, activo, created_at, updated_at
  `;
  return row ?? null;
}

export async function deactivateUsuario(id: string) {
  const [row] = await sql`
    UPDATE usuarios
    SET activo = false, updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, nombre, correo, rol
  `;
  return row ?? null;
}

export async function deleteUsuarioFisico(id: string) {
  const [row] = await sql`
    DELETE FROM usuarios
    WHERE id = ${id}
    RETURNING id, nombre, correo, rol, activo, created_at, updated_at
  `;
  return row ?? null;
}

export async function findCoordinadorActivo(id: string) {
  const [row] = await sql`
    SELECT id FROM usuarios WHERE id = ${id} AND rol = 'coordinador' AND activo = true
  `;
  return row ?? null;
}

export async function findTecnicoActivo(id: string) {
  const [row] = await sql`
    SELECT id FROM usuarios WHERE id = ${id} AND rol = 'tecnico' AND activo = true
  `;
  return row ?? null;
}
