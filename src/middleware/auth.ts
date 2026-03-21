import { createMiddleware } from "hono/factory";
import { redis } from "@/lib/redis";
import type { JwtPayload } from "@/lib/jwt";

type SessionPayload = {
  usuario_id: string;
  rol: JwtPayload["rol"];
  nombre: string;
  correo: string;
  created_at: string;
};

type Env = { Variables: { user: JwtPayload; sessionToken: string } };

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const authHeader = c.req.header("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) return c.json({ error: "No autenticado" }, 401);

  const rawSession = await redis.get(`session:${token}`);
  if (!rawSession) return c.json({ error: "Token invalido o expirado" }, 401);

  let session: SessionPayload;
  try {
    session = JSON.parse(rawSession) as SessionPayload;
  } catch {
    return c.json({ error: "Sesion invalida" }, 401);
  }

  c.set("sessionToken", token);
  c.set("user", {
    sub: session.usuario_id,
    nombre: session.nombre,
    rol: session.rol,
    correo: session.correo,
  });

  return next();
});

function normalizeRole(role: string): string {
  return role === "admin" ? "administrador" : role;
}

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
