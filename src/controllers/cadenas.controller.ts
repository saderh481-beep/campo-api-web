import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import { crearCadena, editarCadena, eliminarCadena, listarCadenas } from "@/services/cadenas.service";
import type { CadenaInput, CadenaUpdateInput } from "@/models/cadenas.model";

export async function getCadenas(c: Context<AppEnv>) {
  const rows = await listarCadenas();
  return c.json(rows);
}

export async function postCadena(c: Context<AppEnv>, body: CadenaInput) {
  const user = c.get("user");
  const row = await crearCadena(body, user.sub);
  return c.json(row, 201);
}

export async function patchCadena(c: Context<AppEnv>, body: CadenaUpdateInput) {
  const { id } = c.req.param();
  const result = await editarCadena(id, body);
  return c.json(result.body, result.status);
}

export async function deleteCadena(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const result = await eliminarCadena(id);
  return c.json(result.body, result.status);
}
