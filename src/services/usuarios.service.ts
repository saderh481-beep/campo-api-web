import { randomInt, createHash } from "node:crypto";
import {
  createUsuario,
  deactivateUsuario,
  deleteUsuarioFisico,
  existsUsuarioByCodigo,
  existsUsuarioByCorreo,
  findUsuarioById,
  listUsuarios,
  updateUsuario,
  type UsuarioInput,
  type UsuarioUpdateInput,
} from "@/models/usuarios.model";

function hashSHA512(input: string): string {
  return createHash("sha512").update(input).digest("hex");
}

function getCodeLengthByRole(rol: string): number {
  return rol === "tecnico" ? 5 : 6;
}

async function generarCodigoAccesoUnico(length: number): Promise<string> {
  const min = 10 ** (length - 1);
  const max = 10 ** length;

  while (true) {
    const candidate = randomInt(min, max).toString();
    const exists = await existsUsuarioByCodigo(candidate);
    if (!exists) return candidate;
  }
}

export async function listarUsuarios() {
  return listUsuarios();
}

export async function crearUsuario(input: UsuarioInput) {
  const existe = await existsUsuarioByCorreo(input.correo);
  if (existe) return { status: 409 as const, body: { error: "El correo ya está registrado" } };

  const codigo = await generarCodigoAccesoUnico(getCodeLengthByRole(input.rol));
  const hashCodigo = hashSHA512(codigo);
  const row = await createUsuario({ ...input, codigo_acceso: codigo, hash_codigo_acceso: hashCodigo });
  return { status: 201 as const, body: { ...row, codigo_acceso: codigo } };
}

export async function editarUsuario(id: string, input: UsuarioUpdateInput, rol?: string) {
  const usuario = await findUsuarioById(id);
  if (!usuario) return { status: 404 as const, body: { error: "Usuario no encontrado" } };

  if (input.correo) {
    const duplicado = await existsUsuarioByCorreo(input.correo, id);
    if (duplicado) return { status: 409 as const, body: { error: "El correo ya está registrado" } };
  }

  let hashCodigoAcceso: string | null | undefined = undefined;
  if (input.codigo_acceso) {
    const rolFinal = rol ?? "tecnico";
    const expectedLength = getCodeLengthByRole(rolFinal);
    if (!new RegExp(`^\\d{${expectedLength}}$`).test(input.codigo_acceso)) {
      return { status: 400 as const, body: { error: `El codigo_acceso debe tener ${expectedLength} dígitos para ${rolFinal}` } };
    }
    hashCodigoAcceso = hashSHA512(input.codigo_acceso);
  }

  const row = await updateUsuario(id, { ...input, hash_codigo_acceso: hashCodigoAcceso });
  return { status: 200 as const, body: row };
}

export async function eliminarUsuario(id: string, actorId: string) {
  if (id === actorId) return { status: 400 as const, body: { error: "No puedes eliminar tu propia cuenta" } };
  
  const usuario = await findUsuarioById(id);
  if (!usuario) return { status: 404 as const, body: { error: "Usuario no encontrado" } };
  
  await deactivateUsuario(id);
  return { status: 200 as const, body: { message: "Usuario eliminado" } };
}

export async function eliminarUsuarioFisico(id: string, actorId: string) {
  if (id === actorId) return { status: 400 as const, body: { error: "No puedes eliminar tu propia cuenta" } };
  
  const usuario = await findUsuarioById(id);
  if (!usuario) return { status: 404 as const, body: { error: "Usuario no encontrado" } };
  
  const result = await deleteUsuarioFisico(id);
  if (!result) return { status: 404 as const, body: { error: "Usuario no encontrado" } };

  return { status: 200 as const, body: { message: "Usuario eliminado permanentemente", usuario: result } };
}
