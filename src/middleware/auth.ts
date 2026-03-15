import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { verifyToken } from "@/lib/jwt";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export const requireAuth = createMiddleware(async (c, next) => {
  const token = getCookie(c, "session");
  if (!token) throw new UnauthorizedError();

  try {
    const payload = await verifyToken(token);
    c.set("jwtPayload", payload);
    await next();
  } catch {
    throw new UnauthorizedError("Sesión inválida o expirada");
  }
});

export const requireAdmin = createMiddleware(async (c, next) => {
  const { rol } = c.get("jwtPayload");
  if (rol !== "admin") throw new ForbiddenError("Solo administradores");
  await next();
});

export const requireCoordinador = createMiddleware(async (c, next) => {
  const { rol } = c.get("jwtPayload");
  if (rol !== "admin" && rol !== "coordinador") throw new ForbiddenError();
  await next();
});
