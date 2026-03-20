import { verifyJwt, type JwtPayload } from "@/lib/jwt";
import { createMiddleware } from "hono/factory";
import { sql } from "@/db";

type Env = { Variables: { user: JwtPayload } };

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const cookie = c.req.header("cookie") ?? "";
  const match = cookie.match(/session=([^;]+)/);
  const token = match?.[1];

  if (!token) return c.json({ error: "No autenticado" }, 401);

  const payload = await verifyJwt(token);
  if (!payload) return c.json({ error: "Token inválido o expirado" }, 401);

  const [usuario] = await sql`
    SELECT id, nombre, rol, activo
    FROM usuarios
    WHERE id = ${payload.sub}
  `;

  if (!usuario || !usuario.activo) {
    return c.json({ error: "Usuario no autorizado" }, 401);
  }

  c.set("user", { sub: usuario.id, nombre: usuario.nombre, rol: usuario.rol });
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
