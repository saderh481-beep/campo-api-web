export interface Zona {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ZonaCreate {
  nombre: string;
  descripcion?: string;
}

export interface ZonaUpdate {
  nombre?: string;
  descripcion?: string;
}
