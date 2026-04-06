export type Rol = "admin" | "coordinador" | "tecnico";

export type EstadoCorte = "activo" | "en_servicio" | "suspendido" | "baja";

export interface Usuario {
  id: string;
  correo: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  codigo_acceso: string | null;
  hash_codigo_acceso: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UsuarioCreate {
  correo: string;
  nombre: string;
  rol: Rol;
}

export interface UsuarioUpdate {
  correo?: string;
  nombre?: string;
  rol?: Rol;
  codigo_acceso?: string;
  activo?: boolean;
}

export interface TecnicoDetalle {
  id: string;
  tecnico_id: string;
  coordinador_id: string;
  fecha_limite: Date | null;
  estado_corte: EstadoCorte;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}
