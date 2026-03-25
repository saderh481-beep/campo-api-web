import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import { cerrarSesion, iniciarSesion, solicitarCodigoAcceso } from "@/services/auth.service";

function getClientMetadata(c: Context<AppEnv>) {
  return {
    ip: (c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown").split(",")[0].trim(),
    userAgent: c.req.header("user-agent") ?? null,
  };
}

export async function postRequestCodigoAcceso(c: Context<AppEnv>) {
  const body = await solicitarCodigoAcceso();
  return c.json(body);
}

export async function postLogin(c: Context<AppEnv>, body: { correo: string; codigo_acceso: string }) {
  const result = await iniciarSesion(body, getClientMetadata(c));
  return c.json(result.body, result.status);
}

export async function postLogout(c: Context<AppEnv>) {
  const token = c.get("sessionToken") as string | undefined;
  const user = c.get("user");
  const body = await cerrarSesion(token, user?.sub, getClientMetadata(c));
  return c.json(body);
}