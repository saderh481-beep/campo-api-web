import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import type { UsuarioCreate, UsuarioUpdate } from "@/domain/entities/usuario.entity";
import { UsuarioService } from "@/services/usuario.service";
import { CodigoAccesoService } from "@/validators/codigo-acceso.validator";

const usuarioService = new UsuarioService(new CodigoAccesoService());

export async function getUsuarios(c: Context<AppEnv>) {
  const usuarios = await usuarioService.listar();
  return c.json(usuarios);
}

export async function postUsuario(c: Context<AppEnv>, body: UsuarioCreate) {
  const result = await usuarioService.crear(body);
  return c.json(result.body, result.status);
}

export async function patchUsuario(c: Context<AppEnv>, body: UsuarioUpdate) {
  const { id } = c.req.param();
  const result = await usuarioService.editar(id, body);
  return c.json(result.body, result.status);
}

export async function deleteUsuario(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const user = c.get("user");
  const result = await usuarioService.eliminar(id, user.sub);
  return c.json(result.body, result.status);
}

export async function deleteUsuarioFisico(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const user = c.get("user");
  const result = await usuarioService.eliminarFisico(id, user.sub);
  return c.json(result.body, result.status);
}
