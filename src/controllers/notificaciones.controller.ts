import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import {
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLasNotificacionesLeidas,
} from "@/services/notificaciones.service";

export async function getNotificaciones(c: Context<AppEnv>) {
  const user = c.get("user");
  const rows = await listarNotificaciones(user.sub);
  return c.json(rows);
}

export async function patchNotificacionLeida(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const user = c.get("user");
  const body = await marcarNotificacionLeida(id, user.sub);
  return c.json(body);
}

export async function patchNotificacionesLeerTodas(c: Context<AppEnv>) {
  const user = c.get("user");
  const body = await marcarTodasLasNotificacionesLeidas(user.sub);
  return c.json(body);
}