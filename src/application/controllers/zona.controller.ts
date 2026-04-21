import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import type { JwtPayload } from "@/infrastructure/lib/jwt";
import { ZonaService } from "@/application/services/zona.service";
import type { ZonaCreateDto, ZonaUpdateDto } from "@/application/dto/zona.dto";

const zonaService = new ZonaService();

export async function getZonas(c: Context<AppEnv>) {
  const zonas = await zonaService.listar();
  return c.json(zonas);
}

export async function postZona(c: Context<AppEnv>, body: ZonaCreateDto) {
  const user = c.get("user") as JwtPayload;
  const zona = await zonaService.crear(body, user.sub);
  return c.json(zona, 201);
}

export async function patchZona(c: Context<AppEnv>, id: string, body: Partial<ZonaUpdateDto>) {
  const result = await zonaService.editar(id, body);
  return c.json(result.body, result.status);
}

export async function deleteZona(c: Context<AppEnv>, id: string) {
  const result = await zonaService.eliminar(id);
  return c.json(result.body, result.status);
}