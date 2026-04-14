import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import { redis } from "@/lib/redis";
import { sql } from "@/db";
import v1Routes from "@/routes/v1";

const app = new Hono();

app.use("*", logger());
app.use("*", secureHeaders());

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://web-campo-campo-saas.up.railway.app",
  "https://campo-web-campo-saas.up.railway.app",
];

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "*";
      if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".up.railway.app")) {
        return origin;
      }
      return ALLOWED_ORIGINS[0] || "*";
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With", "X-Session-Id", "x-session-id"],
  })
);

const getHealthStatus = async () => {
  const checks: Record<string, "ok" | "error"> = {};
  let overall = "ok";

  try {
    await sql`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
    overall = "degraded";
  }

  try {
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
    overall = "degraded";
  }

  return { status: overall, checks, ts: new Date().toISOString() };
};

app.get("/health", async (c) => {
  const health = await getHealthStatus();
  const statusCode = health.status === "ok" ? 200 : 503;
  return c.json({ service: "api-web", ...health }, statusCode);
});

app.get("/api/v1/health", async (c) => {
  const health = await getHealthStatus();
  const statusCode = health.status === "ok" ? 200 : 503;
  return c.json({ service: "api-web", version: "v1", ...health }, statusCode);
});

app.route("/api/v1", v1Routes);

app.notFound((c) => c.json({ error: "Ruta no encontrada" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Error interno del servidor" }, 500);
});

export default app;
