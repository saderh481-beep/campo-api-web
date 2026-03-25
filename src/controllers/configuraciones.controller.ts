import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import { editarConfiguracion, listarConfiguraciones, obtenerConfiguracion } from "@/services/configuraciones.service";

export async function getConfiguraciones(c: Context<AppEnv>) {
  const rows = await listarConfiguraciones();
  return c.json(rows);
}

export async function getConfiguracion(c: Context<AppEnv>) {
  const { clave } = c.req.param();
  const result = await obtenerConfiguracion(clave);
  return c.json(result.body, result.status);
}

export async function putConfiguracion(c: Context<AppEnv>, valor: Record<string, unknown>) {
  const { clave } = c.req.param();
  const user = c.get("user");
  const result = await editarConfiguracion(clave, valor, user.sub);
  return c.json(result.body, result.status);
}