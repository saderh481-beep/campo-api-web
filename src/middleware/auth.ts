import { createMiddleware } from "hono/factory";
import { redis } from "@/lib/redis";
import { verifyJwt } from "@/lib/jwt";
import type { JwtPayload } from "@/lib/jwt";
import type { AppEnv, SessionPayload } from "@/types/http";
import { normalizeRole } from "@/lib/crypto-utils";

type Env = AppEnv & { Variables: { user: JwtPayload; sessionToken: string } };

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const authHeader = c.req.header("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) return c.json({ error: "No autenticado" }, 401);

  let session: SessionPayload | null = null;
  let useJwtFallback = false;
  let redisAvailable = true;

  try {
    const rawSession = await redis.get(`session:${token}`);
    if (rawSession) {
      session = JSON.parse(rawSession) as SessionPayload;
    } else {
      redisAvailable = true;
    }
  } catch (e) {
    console.warn("[Auth] Redis no disponible, usando JWT");
    redisAvailable = false;
    useJwtFallback = true;
  }

  if (redisAvailable && !session) {
    return c.json({ error: "Token inválido o expirado" }, 401);
  }

  if (useJwtFallback) {
    try {
      const jwtPayload = await verifyJwt(token);
      if (!jwtPayload) return c.json({ error: "Token inválido o expirado" }, 401);
      session = {
        usuario_id: jwtPayload.sub,
        nombre: jwtPayload.nombre,
        correo: jwtPayload.correo ?? "",
        rol: jwtPayload.rol,
        created_at: new Date().toISOString(),
        login_at: new Date().toISOString(),
      };
    } catch (e) {
      console.error("[Auth] Error al verificar JWT:", e);
      return c.json({ error: "Token inválido o expirado" }, 401);
    }
  }

  if (!session) return c.json({ error: "Token inválido o expirado" }, 401);

  c.set("sessionToken", token);
  c.set("user", {
    sub: session.usuario_id,
    nombre: session.nombre,
    rol: session.rol,
    correo: session.correo,
  });

  return next();
});

export function requireRole(...roles: string[]) {
  return createMiddleware<Env>(async (c, next) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "No autenticado" }, 401);

    const expectedRoles = roles.map(normalizeRole);
    const userRole = normalizeRole(user.rol);

    if (!expectedRoles.includes(userRole)) return c.json({ error: "Sin permisos" }, 403);
    return next();
  });
}
