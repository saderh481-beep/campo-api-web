// ── Roles ──────────────────────────────────────────────────────────────────────
export type Rol = "admin" | "coordinador";

// ── JWT payload (api-web) ──────────────────────────────────────────────────────
export interface JWTPayload {
  sub: string;
  rol: Rol;
  coordinadorId?: string;
  iat: number;
  exp: number;
}

// ── Context variables ──────────────────────────────────────────────────────────
declare module "hono" {
  interface ContextVariableMap {
    jwtPayload: JWTPayload;
  }
}

// ── Entidades ──────────────────────────────────────────────────────────────────
export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  coordinadorId: string | null;
  activo: boolean;
  creadoEn: Date;
}

export interface Tecnico {
  id: string;
  coordinadorId: string;
  nombre: string;
  codigoAcceso: string;
  fechaLimite: Date;
  activo: boolean;
  creadoEn: Date;
}

export interface CadenaProductiva {
  id: string;
  nombre: string;
  activo: boolean;
  creadoBy: string;
  creadoEn: Date;
}

export interface Actividad {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  creadoEn: Date;
}

export interface Beneficiario {
  id: string;
  tecnicoId: string;
  nombre: string;
  curp: string | null;
  telefono: string | null;
  municipio: string | null;
  localidad: string | null;
  activo: boolean;
  creadoEn: Date;
}

export type TipoBitacora = "A" | "B";
export type EstadoBitacora = "borrador" | "cerrada";

export interface Bitacora {
  id: string;
  tecnicoId: string;
  tipo: TipoBitacora;
  estado: EstadoBitacora;
  beneficiarioId: string | null;
  cadenaProductivaId: string | null;
  actividadId: string | null;
  fechaInicio: Date;
  fechaFin: Date | null;
  gpsInicio: { lat: number; lng: number } | null;
  gpsFin: { lat: number; lng: number } | null;
  notas: string | null;
  creadoEn: Date;
}

// ── Respuestas API ─────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
