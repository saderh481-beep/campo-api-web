import { verifyJwt, type JwtPayload } from "@/lib/jwt";
import { createMiddleware } from "hono/factory";

type Env = { Variables: { user: JwtPayload } };

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const cookie = c.req.header("cookie") ?? "";
  const match = cookie.match(/session=([^;]+)/);
  const token = match?.[1];

  if (!token) return c.json({ error: "No autenticado" }, 401);

  const payload = await verifyJwt(token);
  if (!payload) return c.json({ error: "Token inválido o expirado" }, 401);

  c.set("user", payload);
  return next();
});

export function requireRole(...roles: JwtPayload["rol"][]) {
  return createMiddleware<Env>(async (c, next) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "No autenticado" }, 401);
    if (!roles.includes(user.rol)) return c.json({ error: "Sin permisos" }, 403);
    return next();
  });
}
