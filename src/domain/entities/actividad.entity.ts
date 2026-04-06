export interface Actividad {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ActividadCreate {
  nombre: string;
  descripcion?: string;
}

export interface ActividadUpdate {
  nombre?: string;
  descripcion?: string;
}
