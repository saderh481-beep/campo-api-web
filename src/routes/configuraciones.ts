import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "@/db";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { JwtPayload } from "@/lib/jwt";

const app = new Hono<{ Variables: { user: JwtPayload } }>();
app.use("*", authMiddleware);

// GET / — lista todas las configuraciones (solo admin)
app.get("/", requireRole("administrador"), async (c) => {
  const configs = await sql`
    SELECT clave, valor, descripcion, updated_at
    FROM configuraciones
    ORDER BY clave
  `;
  return c.json(configs);
});

// GET /:clave — leer una configuración específica (admin + coordinador)
app.get("/:clave", requireRole("administrador", "coordinador"), async (c) => {
  const { clave } = c.req.param();
  const [config] = await sql`
    SELECT clave, valor, descripcion, updated_at
    FROM configuraciones
    WHERE clave = ${clave}
  `;
  if (!config) return c.json({ error: "Configuración no encontrada" }, 404);
  return c.json(config);
});

// PUT /:clave — actualizar valor (solo admin)
app.put(
  "/:clave",
  requireRole("administrador"),
  zValidator("json", z.object({ valor: z.record(z.string(), z.unknown()) })),
  async (c) => {
    const { clave } = c.req.param();
    const { valor } = c.req.valid("json");
    const user = c.get("user");
    const [actualizada] = await sql`
      UPDATE configuraciones SET
        valor      = ${JSON.stringify(valor)}::jsonb,
        updated_by = ${user.sub},
        updated_at = NOW()
      WHERE clave = ${clave}
      RETURNING clave, valor, descripcion, updated_at
    `;
    if (!actualizada)
      return c.json({ error: "Configuración no encontrada" }, 404);
    return c.json(actualizada);
  }
);

export default app;
