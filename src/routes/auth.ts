import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { compare } from "bcryptjs";
import { rateLimitMiddleware } from "@/middleware/ratelimit";
import { authMiddleware } from "@/middleware/auth";
import { redis } from "@/lib/redis";
import { signJwt } from "@/lib/jwt";
import { createAuthLog, findUsuarioParaLogin } from "@/models/auth.model";
import type { AppEnv, SessionPayload } from "@/types/http";

const app = new Hono<AppEnv>();
const SESSION_TTL_SECONDS = 86400;

app.post(
  "/request-codigo-acceso",
  rateLimitMiddleware(5, 60),
  zValidator("json", z.object({ correo: z.string().email() })),
  (c) => c.json({ message: "Código ya asignado. Usa tu código de acceso." })
);

app.post(
  "/verify-codigo-acceso",
  rateLimitMiddleware(10, 60),
  zValidator("json", z.object({ correo: z.string().email(), codigo_acceso: z.string().regex(/^\d{5,6}$/) })),
  async (c) => {
    try {
      const { correo, codigo_acceso } = c.req.valid("json");
      const ip = c.req.header("x-forwarded-for") ?? "unknown";
      const userAgent = c.req.header("user-agent") ?? "unknown";

      const usuario = await findUsuarioParaLogin(correo);
      if (!usuario?.hash_codigo_acceso) {
        return c.json({ error: "Credenciales inválidas" }, 401);
      }

      const valido = await compare(codigo_acceso, usuario.hash_codigo_acceso);
      if (!valido) {
        return c.json({ error: "Credenciales inválidas" }, 401);
      }

      if (usuario.rol === "tecnico") {
        return c.json({ error: "Los técnicos no pueden iniciar sesión desde la web. Usa la aplicación móvil." }, 403);
      }

      const token = await signJwt({
        sub: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol as "admin" | "coordinador" | "tecnico",
        correo: usuario.correo,
      });

      const createdAt = new Date().toISOString();
      const sessionCache: SessionPayload & { login_at: string; ip: string; user_agent: string | null } = {
        usuario_id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        created_at: createdAt,
        login_at: createdAt,
        ip,
        user_agent: userAgent,
      };

      try {
        await redis.setex(`session:${token}`, SESSION_TTL_SECONDS, JSON.stringify(sessionCache));
      } catch (e) {
        console.warn("[Auth] Redis no disponible, sesión no guardada en cache");
      }
      await createAuthLog(usuario.id, "login", ip, userAgent);

      return c.json({
        token,
        usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol },
      });
    } catch (e) {
      console.error("[Auth] Error en verify-codigo-acceso:", e);
      return c.json({ error: "Error interno del servidor" }, 500);
    }
  }
);

app.post("/login", rateLimitMiddleware(10, 60), zValidator("json", z.object({ correo: z.string().email(), codigo_acceso: z.string().regex(/^\d{5,6}$/) })), async (c) => {
  const body = c.req.valid("json");
  return c.redirect(`/api/v1/auth/verify-codigo-acceso?correo=${body.correo}&codigo_acceso=${body.codigo_acceso}`, 307);
});

app.post("/request-otp", rateLimitMiddleware(5, 60), zValidator("json", z.object({ correo: z.string().email() })), (c) => c.json({ message: "Código ya asignado. Usa tu código de acceso." }));
app.post("/verify-otp", rateLimitMiddleware(10, 60), zValidator("json", z.object({ correo: z.string().email(), codigo_acceso: z.string().regex(/^\d{5,6}$/) })), async (c) => c.redirect("/api/v1/auth/verify-codigo-acceso", 307));

app.post("/logout", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const token = c.get("sessionToken");
    const ip = c.req.header("x-forwarded-for") ?? "unknown";
    const userAgent = c.req.header("user-agent") ?? "unknown";

    try {
      if (token) await redis.del(`session:${token}`);
    } catch {}
    if (user) await createAuthLog(user.sub, "logout", ip, userAgent);

    return c.json({ message: "Sesión cerrada" });
  } catch (e) {
    console.error("[Auth] Error en logout:", e);
    return c.json({ error: "Error al cerrar sesión" }, 500);
  }
});

export default app;