import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import type { ValorConfiguracion } from "@/domain/entities/configuracion.entity";
import { ConfiguracionService } from "@/application/services/configuracion.service";

const configuracionService = new ConfiguracionService();

export async function getConfiguraciones(c: Context<AppEnv>) {
  const configuraciones = await configuracionService.listar();
  return c.json(configuraciones);
}

export async function getConfiguracion(c: Context<AppEnv>) {
  const { clave } = c.req.param();
  const result = await configuracionService.obtener(clave);
  return c.json(result.body, result.status);
}

export async function putConfiguracion(c: Context<AppEnv>, valor: ValorConfiguracion) {
  const { clave } = c.req.param();
  const user = c.get("user");
  const result = await configuracionService.editar(clave, valor, user.sub);
  return c.json(result.body, result.status);
}
