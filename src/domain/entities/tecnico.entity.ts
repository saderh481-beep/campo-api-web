import type { EstadoCorte } from "./usuario.entity";

export interface Tecnico {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  coordinador_id: string;
  coordinador_nombre: string | null;
  fecha_limite: Date | null;
  estado_corte: EstadoCorte;
  codigo_acceso: string | null;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
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

export interface TecnicoCreate {
  nombre: string;
  correo: string;
  telefono?: string;
  coordinador_id: string;
  fecha_limite: string;
}

export interface TecnicoUpdate {
  nombre?: string;
  correo?: string;
  telefono?: string;
  coordinador_id?: string;
  fecha_limite?: string;
}

export interface AsignacionBeneficiario {
  id: string;
  beneficiario: string;
  activo: boolean;
}
