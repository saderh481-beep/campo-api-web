import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import type { ZonaCreate, ZonaUpdate } from "@/domain/entities/zona.entity";
import { ZonaService } from "@/services/zona.service";

const zonaService = new ZonaService();

export async function getZonas(c: Context<AppEnv>) {
  const zonas = await zonaService.listar();
  return c.json(zonas);
}

export async function postZona(c: Context<AppEnv>, body: ZonaCreate) {
  const user = c.get("user");
  const zona = await zonaService.crear(body, user.sub);
  return c.json(zona, 201);
}

export async function patchZona(c: Context<AppEnv>, body: ZonaUpdate) {
  const { id } = c.req.param();
  const result = await zonaService.editar(id, body);
  return c.json(result.body, result.status);
}

export async function deleteZona(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const result = await zonaService.eliminar(id);
  return c.json(result.body, result.status);
}
