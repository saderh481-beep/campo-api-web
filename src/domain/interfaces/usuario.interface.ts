import type { Rol, Usuario, UsuarioCreate, UsuarioUpdate, TecnicoDetalle } from "@/domain/entities/usuario.entity";

export interface IUsuarioRepository {
  findById(id: string): Promise<Usuario | null>;
  findByCorreo(correo: string): Promise<Usuario | null>;
  existsByCorreo(correo: string, exceptId?: string): Promise<boolean>;
  existsByCodigo(codigo: string): Promise<boolean>;
  findAll(): Promise<Usuario[]>;
  create(data: UsuarioCreate & { codigo_acceso: string; hash_codigo_acceso: string }): Promise<Usuario>;
  update(id: string, data: Partial<UsuarioUpdate> & { hash_codigo_acceso?: string | null }): Promise<Usuario | null>;
  deactivate(id: string): Promise<Usuario | null>;
  delete(id: string): Promise<Usuario | null>;
}

export interface ITecnicoDetalleRepository {
  findByTecnicoId(tecnicoId: string): Promise<TecnicoDetalle | null>;
  findByCoordinadorId(coordinadorId: string): Promise<TecnicoDetalle[]>;
  upsert(data: { tecnico_id: string; coordinador_id: string; fecha_limite: string }): Promise<TecnicoDetalle>;
  update(tecnicoId: string, data: Partial<TecnicoDetalle>): Promise<TecnicoDetalle | null>;
}

export interface ICodigoAccesoService {
  generar(rol: Rol): Promise<string>;
  validar(codigo: string, rol: Rol): boolean;
  hashear(codigo: string): string;
  getLongitudPorRol(rol: Rol): number;
}
