import type { Configuracion, ConfiguracionUpdate, ValorConfiguracion } from "@/domain/entities/configuracion.entity";
import {
  findAllConfiguraciones,
  findConfiguracionByClave,
  updateConfiguracion,
} from "@/repositories/configuracion.repository";

export type ServiceResult<T = unknown> = {
  status: 200 | 201 | 400 | 404 | 409;
  body: T;
};

export class ConfiguracionService {
  async listar(): Promise<Configuracion[]> {
    return findAllConfiguraciones();
  }

  async obtener(clave: string): Promise<ServiceResult<Configuracion | { error: string }>> {
    const configuracion = await findConfiguracionByClave(clave);
    if (!configuracion) {
      return { status: 404 as const, body: { error: "Configuración no encontrada" } };
    }
    return { status: 200 as const, body: configuracion };
  }

  async editar(
    clave: string,
    valor: ValorConfiguracion,
    userId: string
  ): Promise<ServiceResult<Configuracion | { error: string }>> {
    const configuracion = await findConfiguracionByClave(clave);
    if (!configuracion) {
      return { status: 404 as const, body: { error: "Configuración no encontrada" } };
    }

    const actualizada = await updateConfiguracion(clave, { valor }, userId);
    if (!actualizada) {
      return { status: 404 as const, body: { error: "Configuración no encontrada" } };
    }

    return { status: 200 as const, body: actualizada };
  }
}
