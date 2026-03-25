import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import {
  actualizarTecnico,
  aplicarCortes,
  cerrarCorte,
  eliminarTecnico,
  listarTecnicos,
  obtenerTecnicoDetalle,
  regenerarCodigoTecnico,
} from "@/services/tecnicos.service";
import type { TecnicoUpdateInput } from "@/models/tecnicos.model";

export async function getTecnicos(c: Context<AppEnv>) {
  const user = c.get("user");
  const rows = await listarTecnicos(user.sub, user.rol);
  return c.json(rows);
}

export async function getTecnicoById(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const user = c.get("user");
  const result = await obtenerTecnicoDetalle(id, user.sub, user.rol);
  return c.json(result.body, result.status);
}

export async function patchTecnicoWithBody(c: Context<AppEnv>, body: TecnicoUpdateInput) {
  const { id } = c.req.param();
  const result = await actualizarTecnico(id, body);
  return c.json(result.body, result.status);
}

export async function postTecnicoCodigo(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const result = await regenerarCodigoTecnico(id);
  return c.json(result.body, result.status);
}

export async function postAplicarCortes(c: Context<AppEnv>) {
  const result = await aplicarCortes();
  return c.json(result.body, result.status);
}

export async function postCerrarCorte(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const user = c.get("user");
  const result = await cerrarCorte(id, user.sub, user.rol);
  return c.json(result.body, result.status);
}

export async function deleteTecnico(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const result = await eliminarTecnico(id);
  return c.json(result.body, result.status);
}
