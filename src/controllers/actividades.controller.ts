import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import { crearActividad, editarActividad, eliminarActividad, listarActividades } from "@/services/actividades.service";
import type { ActividadInput, ActividadUpdateInput } from "@/models/actividades.model";

export async function getActividades(c: Context<AppEnv>) {
  const rows = await listarActividades();
  return c.json(rows);
}

export async function postActividad(c: Context<AppEnv>, body: ActividadInput) {
  const user = c.get("user");
  const row = await crearActividad(body, user.sub);
  return c.json(row, 201);
}

export async function patchActividad(c: Context<AppEnv>, body: ActividadUpdateInput) {
  const { id } = c.req.param();
  const result = await editarActividad(id, body);
  return c.json(result.body, result.status);
}

export async function deleteActividad(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const result = await eliminarActividad(id);
  return c.json(result.body, result.status);
}
