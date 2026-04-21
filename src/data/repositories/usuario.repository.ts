import { sql } from "@/infrastructure/db";
import type { Usuario, UsuarioCreate, UsuarioUpdate } from "@/domain/entities/usuario.entity";

export async function findUsuarioById(id: string): Promise<Usuario | null> {
  const [row] = await sql`
    SELECT id, correo, nombre, rol, activo, codigo_acceso, hash_codigo_acceso, created_at, updated_at
    FROM usuarios
    WHERE id = ${id}
  `;
  return (row ?? null) as Usuario | null;
}

export async function findUsuarioByCorreo(correo: string): Promise<Usuario | null> {
  const [row] = await sql`
    SELECT id, correo, nombre, rol, activo, codigo_acceso, hash_codigo_acceso, created_at, updated_at
    FROM usuarios
    WHERE correo = ${correo}
  `;
  return (row ?? null) as Usuario | null;
}

export async function existsUsuarioByCorreo(correo: string, exceptId?: string): Promise<boolean> {
  const [row] = exceptId
    ? await sql`SELECT id FROM usuarios WHERE correo = ${correo} AND id <> ${exceptId}`
    : await sql`SELECT id FROM usuarios WHERE correo = ${correo}`;
  return Boolean(row);
}

export async function existsUsuarioByCodigo(codigo: string): Promise<boolean> {
  const [row] = await sql`SELECT id FROM usuarios WHERE codigo_acceso = ${codigo} LIMIT 1`;
  return Boolean(row);
}

export async function findAllUsuarios(): Promise<Usuario[]> {
  const rows = await sql`
    SELECT id, correo, nombre, rol, activo, codigo_acceso, hash_codigo_acceso, created_at, updated_at
    FROM usuarios
    ORDER BY created_at DESC
  `;
  return rows as unknown as Usuario[];
}

export async function createUsuario(data: UsuarioCreate & { codigo_acceso: string; hash_codigo_acceso: string }): Promise<Usuario> {
  const [row] = await sql`
    INSERT INTO usuarios (correo, nombre, rol, codigo_acceso, hash_codigo_acceso)
    VALUES (${data.correo}, ${data.nombre}, ${data.rol}, ${data.codigo_acceso}, ${data.hash_codigo_acceso})
    RETURNING id, correo, nombre, rol, activo, codigo_acceso, hash_codigo_acceso, created_at, updated_at
  `;
  return row as Usuario;
}

export async function updateUsuario(id: string, data: Partial<UsuarioUpdate> & { hash_codigo_acceso?: string | null }): Promise<Usuario | null> {
  const [row] = await sql`
    UPDATE usuarios SET
      correo = COALESCE(${data.correo ?? null}, correo),
      nombre = COALESCE(${data.nombre ?? null}, nombre),
      rol = COALESCE(${data.rol ?? null}, rol),
      codigo_acceso = COALESCE(${data.codigo_acceso ?? null}, codigo_acceso),
      hash_codigo_acceso = COALESCE(${data.hash_codigo_acceso ?? null}, hash_codigo_acceso),
      activo = COALESCE(${data.activo ?? null}, activo),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, correo, nombre, rol, activo, codigo_acceso, hash_codigo_acceso, created_at, updated_at
  `;
  return (row ?? null) as Usuario | null;
}

export async function deactivateUsuario(id: string): Promise<Usuario | null> {
  const [row] = await sql`
    UPDATE usuarios SET activo = false, updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, correo, nombre, rol, activo, codigo_acceso, hash_codigo_acceso, created_at, updated_at
  `;
  return (row ?? null) as Usuario | null;
}

export async function deleteUsuario(id: string): Promise<Usuario | null> {
  const [row] = await sql`
    DELETE FROM usuarios WHERE id = ${id}
    RETURNING id, correo, nombre, rol, activo, codigo_acceso, hash_codigo_acceso, created_at, updated_at
  `;
  return (row ?? null) as Usuario | null;
}
