import type { Usuario, UsuarioCreate, UsuarioUpdate } from "@/domain/entities/usuario.entity";
import type { ICodigoAccesoService } from "@/domain/interfaces/usuario.interface";
import {
  findUsuarioById,
  findUsuarioByCorreo,
  existsUsuarioByCorreo,
  findAllUsuarios,
  createUsuario,
  updateUsuario,
  deactivateUsuario,
  deleteUsuario,
} from "@/data/repositories/usuario.repository";

export type ServiceResult<T = unknown> = {
  status: 200 | 201 | 400 | 404 | 409;
  body: T;
};

export class UsuarioService {
  constructor(private readonly codigoService: ICodigoAccesoService) {}

  async listar(): Promise<Usuario[]> {
    return findAllUsuarios();
  }

  async crear(input: UsuarioCreate): Promise<ServiceResult> {
    const existe = await existsUsuarioByCorreo(input.correo);
    if (existe) {
      return { status: 409 as const, body: { error: "El correo ya está registrado" } };
    }

    const codigo = await this.codigoService.generar(input.rol);
    const hashCodigo = this.codigoService.hashear(codigo);
    const usuario = await createUsuario({ ...input, codigo_acceso: codigo, hash_codigo_acceso: hashCodigo });

    return { status: 201 as const, body: { ...usuario, codigo_acceso: codigo } };
  }

  async editar(id: string, input: UsuarioUpdate): Promise<ServiceResult> {
    const usuario = await findUsuarioById(id);
    if (!usuario) {
      return { status: 404 as const, body: { error: "Usuario no encontrado" } };
    }

    if (input.correo) {
      const duplicado = await existsUsuarioByCorreo(input.correo, id);
      if (duplicado) {
        return { status: 409 as const, body: { error: "El correo ya está registrado" } };
      }
    }

    let hashCodigo: string | null | undefined = undefined;
    if (input.codigo_acceso) {
      const rol = input.rol ?? usuario.rol;
      if (!this.codigoService.validar(input.codigo_acceso, rol)) {
        const longitud = this.codigoService.getLongitudPorRol(rol);
        return {
          status: 400 as const,
          body: { error: `El código de acceso debe tener ${longitud} dígitos para ${rol}` },
        };
      }
      hashCodigo = this.codigoService.hashear(input.codigo_acceso);
    }

    const actualizado = await updateUsuario(id, { ...input, hash_codigo_acceso: hashCodigo });
    return { status: 200 as const, body: actualizado };
  }

  async eliminar(id: string, actorId: string): Promise<ServiceResult> {
    if (id === actorId) {
      return { status: 400 as const, body: { error: "No puedes eliminar tu propia cuenta" } };
    }

    const usuario = await findUsuarioById(id);
    if (!usuario) {
      return { status: 404 as const, body: { error: "Usuario no encontrado" } };
    }

    await deactivateUsuario(id);
    return { status: 200 as const, body: { message: "Usuario eliminado" } };
  }

  async eliminarFisico(id: string, actorId: string): Promise<ServiceResult> {
    if (id === actorId) {
      return { status: 400 as const, body: { error: "No puedes eliminar tu propia cuenta" } };
    }

    const usuario = await findUsuarioById(id);
    if (!usuario) {
      return { status: 404 as const, body: { error: "Usuario no encontrado" } };
    }

    const eliminado = await deleteUsuario(id);
    if (!eliminado) {
      return { status: 404 as const, body: { error: "Usuario no encontrado" } };
    }

    return { status: 200 as const, body: { message: "Usuario eliminado permanentemente", usuario: eliminado } };
  }
}
