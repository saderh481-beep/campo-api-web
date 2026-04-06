import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import { TecnicoService } from "@/services/tecnico.service";
import { CodigoAccesoService } from "@/validators/codigo-acceso.validator";
import type { TecnicoUpdate } from "@/domain/entities/tecnico.entity";

const tecnicoService = new TecnicoService(new CodigoAccesoService());

export async function getTecnicos(c: Context<AppEnv>) {
  const user = c.get("user");
  const rows = await tecnicoService.listar(user.sub, user.rol);
  return c.json(rows);
}

export async function getTecnicoById(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const user = c.get("user");
  const result = await tecnicoService.obtenerDetalle(id, user.sub, user.rol);
  return c.json(result.body, result.status);
}

export async function patchTecnicoWithBody(c: Context<AppEnv>, body: TecnicoUpdate) {
  const { id } = c.req.param();
  const result = await tecnicoService.actualizar(id, body);
  return c.json(result.body, result.status);
}

export async function postTecnicoCodigo(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const result = await tecnicoService.regenerarCodigo(id);
  return c.json(result.body, result.status);
}

export async function postAplicarCortes(c: Context<AppEnv>) {
  const result = await tecnicoService.aplicarCortes();
  return c.json(result.body, result.status);
}

export async function postCerrarCorte(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const user = c.get("user");
  const result = await tecnicoService.cerrarCorte(id, user.sub, user.rol);
  return c.json(result.body, result.status);
}

export async function deleteTecnico(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const result = await tecnicoService.eliminar(id);
  return c.json(result.body, result.status);
}
