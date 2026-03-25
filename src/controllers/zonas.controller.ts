import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import { crearZona, editarZona, eliminarZona, listarZonas } from "@/services/zonas.service";
import type { ZonaInput, ZonaUpdateInput } from "@/models/zonas.model";

export async function getZonas(c: Context<AppEnv>) {
  const rows = await listarZonas();
  return c.json(rows);
}

export async function postZona(c: Context<AppEnv>, body: ZonaInput) {
  const user = c.get("user");
  const row = await crearZona(body, user.sub);
  return c.json(row, 201);
}

export async function patchZona(c: Context<AppEnv>, body: ZonaUpdateInput) {
  const { id } = c.req.param();
  const result = await editarZona(id, body);
  return c.json(result.body, result.status);
}

export async function deleteZona(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const result = await eliminarZona(id);
  return c.json(result.body, result.status);
}