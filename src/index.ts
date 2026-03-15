import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { rateLimiter } from "hono-rate-limiter";
import { env } from "@/config/env";
import { sql } from "@/config/db";
import { redis } from "@/config/db";
import { handleError } from "@/lib/errors";

// Módulos
import authRouter          from "@/modules/auth/router";
import usuariosRouter      from "@/modules/usuarios/router";
import tecnicosRouter      from "@/modules/tecnicos/router";
import cadenasRouter       from "@/modules/cadenas/router";
import actividadesRouter   from "@/modules/actividades/router";
import beneficiariosRouter from "@/modules/beneficiarios/router";
import bitacorasRouter     from "@/modules/bitacoras/router";
import reportesRouter      from "@/modules/reportes/router";
import notificacionesRouter from "@/modules/notificaciones/router";

const app = new Hono();

// ── Middleware global ──────────────────────────────────────────────────────────
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", cors({
  origin:         env.WEB_ORIGIN,
  credentials:    true,
  allowMethods:   ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders:   ["Content-Type"],
  exposeHeaders:  ["X-Total-Count"],
}));

// Rate limit global: 120 req / min
app.use("*", rateLimiter({
  windowMs:     60_000,
  limit:        120,
  keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "anon",
}));

// Rate limit estricto en auth: 10 req / 15 min
app.use("/auth/*", rateLimiter({
  windowMs:     15 * 60_000,
  limit:        10,
  keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "anon",
}));

// ── Health check ───────────────────────────────────────────────────────────────
app.get("/health", async (c) => {
  try {
    await sql`SELECT 1`;
    await redis.ping();
    return c.json({ ok: true, service: "api-web", ts: new Date().toISOString() });
  } catch (err) {
    return c.json({ ok: false, error: String(err) }, 503);
  }
});

// ── Rutas ──────────────────────────────────────────────────────────────────────
app.route("/auth",           authRouter);
app.route("/usuarios",       usuariosRouter);
app.route("/tecnicos",       tecnicosRouter);
app.route("/cadenas-productivas", cadenasRouter);
app.route("/actividades",    actividadesRouter);
app.route("/beneficiarios",  beneficiariosRouter);
app.route("/bitacoras",      bitacorasRouter);
app.route("/reportes",       reportesRouter);
app.route("/notificaciones", notificacionesRouter);

// ── Errores ────────────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: "Ruta no encontrada" }, 404));
app.onError(handleError);

// ── Servidor ───────────────────────────────────────────────────────────────────
console.log(`🌱 api-web → http://localhost:${env.PORT}`);
export default { port: env.PORT, fetch: app.fetch };
