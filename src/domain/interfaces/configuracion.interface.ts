import type { Configuracion, ConfiguracionUpdate } from "@/domain/entities/configuracion.entity";

export interface IConfiguracionRepository {
  findAll(): Promise<Configuracion[]>;
  findByClave(clave: string): Promise<Configuracion | null>;
  update(clave: string, data: ConfiguracionUpdate, userId: string): Promise<Configuracion | null>;
}
