import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import { crearLocalidad, editarLocalidad, eliminarLocalidad, listarLocalidades } from "@/services/localidades.service";
import type { LocalidadInput, LocalidadUpdateInput } from "@/models/localidades.model";

export async function getLocalidades(c: Context<AppEnv>) {
  const rows = await listarLocalidades();
  return c.json(rows);
}

export async function postLocalidad(c: Context<AppEnv>, body: LocalidadInput) {
  const user = c.get("user");
  const result = await crearLocalidad(body, user.sub);
  return c.json(result.body, result.status);
}

export async function patchLocalidad(c: Context<AppEnv>, body: LocalidadUpdateInput) {
  const { id } = c.req.param();
  const result = await editarLocalidad(id, body);
  return c.json(result.body, result.status);
}

export async function deleteLocalidad(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const result = await eliminarLocalidad(id);
  return c.json(result.body, result.status);
}