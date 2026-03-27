import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import { crearUsuario, editarUsuario, eliminarUsuario, eliminarUsuarioFisico, listarUsuarios } from "@/services/usuarios.service";
import type { UsuarioInput, UsuarioUpdateInput } from "@/models/usuarios.model";

export async function getUsuarios(c: Context<AppEnv>) {
  const rows = await listarUsuarios();
  return c.json(rows);
}

export async function postUsuario(c: Context<AppEnv>, body: UsuarioInput) {
  const result = await crearUsuario(body);
  return c.json(result.body, result.status);
}

export async function patchUsuario(c: Context<AppEnv>, body: UsuarioUpdateInput) {
  const { id } = c.req.param();
  const result = await editarUsuario(id, body);
  return c.json(result.body, result.status);
}

export async function deleteUsuario(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const user = c.get("user");
  const result = await eliminarUsuario(id, user.sub);
  return c.json(result.body, result.status);
}

export async function deleteUsuarioFisico(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const user = c.get("user");
  const result = await eliminarUsuarioFisico(id, user.sub);
  return c.json(result.body, result.status);
}
