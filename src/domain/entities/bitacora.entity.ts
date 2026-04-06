export type BitacoraEstado = "borrador" | "cerrada";

export interface Bitacora {
  id: string;
  tipo: string;
  tecnico_id: string;
  beneficiario_id: string | null;
  cadena_productiva_id: string | null;
  actividad_id: string | null;
  fecha_inicio: Date;
  fecha_fin: Date | null;
  coord_inicio: { x: number; y: number } | null;
  coord_fin: { x: number; y: number } | null;
  actividades_desc: string;
  recomendaciones: string;
  comentarios_beneficiario: string;
  coordinacion_interinst: boolean;
  instancia_coordinada: string | null;
  proposito_coordinacion: string | null;
  observaciones_coordinador: string | null;
  foto_rostro_url: string | null;
  firma_url: string | null;
  fotos_campo: string[];
  estado: BitacoraEstado;
  pdf_version: number;
  pdf_url_actual: string | null;
  pdf_original_url: string | null;
  pdf_edicion: Record<string, unknown>;
  creada_offline: boolean;
  sync_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface BitacoraListItem {
  id: string;
  tipo: string;
  estado: BitacoraEstado;
  fecha_inicio: Date;
  fecha_fin: Date | null;
  tecnico_nombre: string;
  beneficiario_nombre: string | null;
  cadena_nombre: string | null;
  actividad_nombre: string | null;
}

export interface BitacoraUpdate {
  observaciones?: string;
  actividades_realizadas?: string;
}

export interface BitacoraPdfConfig {
  pdf_edicion: Record<string, unknown>;
}

export interface BitacoraFiltros {
  tecnico_id?: string;
  mes?: number;
  anio?: number;
  estado?: string;
  tipo?: string;
}

export interface PdfVersion {
  id: string;
  version: number;
  r2_key: string;
  sha256: string;
  inmutable: boolean;
  generado_por: string | null;
  created_at: Date;
}

export interface PdfConfig {
  institucion?: string | null;
  dependencia?: string | null;
  logo_url?: string | null;
  pie_pagina?: string | null;
}
