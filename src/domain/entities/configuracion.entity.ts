export type ValorConfiguracion = Record<string, unknown>;

export interface Configuracion {
  clave: string;
  valor: ValorConfiguracion;
  descripcion: string;
  updated_at: Date;
}

export interface ConfiguracionUpdate {
  valor: ValorConfiguracion;
}
