import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "@/db";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { JwtPayload } from "@/lib/jwt";

const app = new Hono<{
  Variables: {
    user: JwtPayload
  }
}>();
app.use("*", authMiddleware, requireRole("admin", "coordinador"));

app.get("/", async (c) => {
  const actividades = await sql`
    SELECT id, nombre, descripcion, activo, created_by, created_at, updated_at FROM actividades ORDER BY nombre
  `;
  return c.json(actividades);
});

app.post(
  "/",
  requireRole("admin"),
  zValidator("json", z.object({ nombre: z.string().min(2), descripcion: z.string().optional() })),
  async (c) => {
    const body = c.req.valid("json");
    const user = c.get("user");
    const [nueva] = await sql`
      INSERT INTO actividades (nombre, descripcion, created_by)
      VALUES (${body.nombre}, ${body.descripcion ?? null}, ${user.sub})
      RETURNING id, nombre, descripcion, activo, created_by, created_at, updated_at
    `;
    return c.json(nueva, 201);
  }
);

app.patch(
  "/:id",
  requireRole("admin"),
  zValidator(
    "json",
    z.object({ nombre: z.string().min(2).optional(), descripcion: z.string().optional(), created_by: z.string().uuid().optional() })
  ),
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");
    const [actualizado] = await sql`
      UPDATE actividades SET
        nombre      = COALESCE(${body.nombre ?? null}, nombre),
        descripcion = COALESCE(${body.descripcion ?? null}, descripcion),
        created_by  = COALESCE(${body.created_by ?? null}, created_by),
        actualizado_en = NOW()
      WHERE id = ${id}
      RETURNING id, nombre, descripcion, activo, created_by, created_at, updated_at
    `;
    if (!actualizado) return c.json({ error: "Actividad no encontrada" }, 404);
    return c.json(actualizado);
  }
);

app.delete("/:id", requireRole("admin"), async (c) => {
  const { id } = c.req.param();
  await sql`UPDATE actividades SET activo = false, actualizado_en = NOW() WHERE id = ${id}`;
  return c.json({ message: "Actividad desactivada" });
});

export default app;
