import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { randomUUID, createHash } from "node:crypto";
import { rateLimitMiddleware } from "@/middleware/ratelimit";
import { authMiddleware } from "@/middleware/auth";
import { redis } from "@/lib/redis";
import { createAuthLog, findTecnicoDetalleParaLogin, findUsuarioParaLogin, marcarTecnicoVencido } from "@/models/auth.model";
import { findConfiguracionByClave } from "@/models/configuraciones.model";
import type { AppEnv, SessionPayload } from "@/types/http";

const app = new Hono<AppEnv>();
const SESSION_TTL_SECONDS = 86400;

function hashSHA512(input: string): string {
  return createHash("sha512").update(input).digest("hex");
}

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
    const { correo, codigo_acceso } = c.req.valid("json");
    const ip = c.req.header("x-forwarded-for") ?? "unknown";
    const userAgent = c.req.header("user-agent") ?? "unknown";

    const usuario = await findUsuarioParaLogin(correo);
    if (!usuario?.hash_codigo_acceso) {
      return c.json({ error: "Credenciales inválidas" }, 401);
    }

    const hashIngresado = hashSHA512(codigo_acceso);
    const valido = hashIngresado === usuario.hash_codigo_acceso;
    if (!valido) {
      return c.json({ error: "Credenciales inválidas" }, 401);
    }

    let fechaCorteGlobal: string | null = null;
    if (usuario.rol === "tecnico") {
      const tecnico = await findTecnicoDetalleParaLogin(usuario.id);
      if (!tecnico) return c.json({ error: "Credenciales inválidas" }, 401);

      const configCorte = await findConfiguracionByClave("fecha_corte_global");
      const fechaConfigurada = (configCorte?.valor as { fecha?: unknown } | null)?.fecha;
      fechaCorteGlobal = typeof fechaConfigurada === "string" && fechaConfigurada.trim().length > 0 ? fechaConfigurada : null;

      const vencido = tecnico.estado_corte === "corte_aplicado" || (fechaCorteGlobal && new Date(fechaCorteGlobal) <= new Date());
      if (vencido) {
        if (tecnico.estado_corte !== "corte_aplicado") await marcarTecnicoVencido(usuario.id);
        return c.json({ error: "periodo_vencido", message: "Tu período de acceso ha concluido." }, 401);
      }

      if (!fechaCorteGlobal) {
        return c.json({ error: "periodo_no_configurado", message: "No hay fecha de corte global configurada." }, 401);
      }
    }

    const token = randomUUID();
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
      ...(fechaCorteGlobal ? { fecha_limite: fechaCorteGlobal } : {}),
    };

    await redis.setex(`session:${token}`, SESSION_TTL_SECONDS, JSON.stringify(sessionCache));
    await createAuthLog(usuario.id, "login", ip, userAgent);

    return c.json({
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol },
    });
  }
);

app.post("/login", rateLimitMiddleware(10, 60), zValidator("json", z.object({ correo: z.string().email(), codigo_acceso: z.string().regex(/^\d{5,6}$/) })), async (c) => {
  const body = c.req.valid("json");
  return c.redirect(`/api/v1/auth/verify-codigo-acceso?correo=${body.correo}&codigo_acceso=${body.codigo_acceso}`, 307);
});

app.post("/request-otp", rateLimitMiddleware(5, 60), zValidator("json", z.object({ correo: z.string().email() })), (c) => c.json({ message: "Código ya asignado. Usa tu código de acceso." }));
app.post("/verify-otp", rateLimitMiddleware(10, 60), zValidator("json", z.object({ correo: z.string().email(), codigo_acceso: z.string().regex(/^\d{5,6}$/) })), async (c) => c.redirect("/api/v1/auth/verify-codigo-acceso", 307));

app.post("/logout", authMiddleware, async (c) => {
  const user = c.get("user");
  const token = c.get("sessionToken");
  const ip = c.req.header("x-forwarded-for") ?? "unknown";
  const userAgent = c.req.header("user-agent") ?? "unknown";

  if (token) await redis.del(`session:${token}`);
  if (user) await createAuthLog(user.sub, "logout", ip, userAgent);

  return c.json({ message: "Sesión cerrada" });
});

export default app;