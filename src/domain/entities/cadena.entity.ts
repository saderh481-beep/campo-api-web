export type Cadena = {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
};

export type CadenaInput = {
  nombre: string;
  descripcion?: string;
};

export type CadenaUpdateInput = {
  nombre?: string;
  descripcion?: string;
};

export type ServiceResponse<T = unknown> =
  | { success: true; data: T; status: number }
  | { success: false; error: string; status: number };
