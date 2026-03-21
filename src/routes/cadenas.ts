import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "@/db";
import { authMiddleware, requireRole } from "@/middleware/auth";

const app = new Hono();
app.use("*", authMiddleware, requireRole("administrador", "coordinador"));

app.get("/", async (c) => {
  const cadenas = await sql`
    SELECT id, nombre, descripcion, activo, created_by, created_at, updated_at FROM cadenas_productivas ORDER BY nombre
  `;
  return c.json(cadenas);
});

app.post(
  "/",
  requireRole("administrador"),
  zValidator("json", z.object({ nombre: z.string().min(2), descripcion: z.string().optional() })),
  async (c) => {
    const body = c.req.valid("json");
    const user = c.get("user");
    const [nueva] = await sql`
      INSERT INTO cadenas_productivas (nombre, descripcion, created_by)
      VALUES (${body.nombre}, ${body.descripcion ?? null}, ${user.sub})
      RETURNING id, nombre, descripcion, activo, created_by, created_at, updated_at
    `;
    return c.json(nueva, 201);
  }
);

app.patch(
  "/:id",
  requireRole("administrador"),
  zValidator(
    "json",
    z.object({ nombre: z.string().min(2).optional(), descripcion: z.string().optional() })
  ),
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");
    const [actualizado] = await sql`
      UPDATE cadenas_productivas SET
        nombre      = COALESCE(${body.nombre ?? null}, nombre),
        descripcion = COALESCE(${body.descripcion ?? null}, descripcion),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, nombre, descripcion, activo, created_by, created_at, updated_at
    `;
    if (!actualizado) return c.json({ error: "Cadena no encontrada" }, 404);
    return c.json(actualizado);
  }
);

app.delete("/:id", requireRole("administrador"), async (c) => {
  const { id } = c.req.param();
  await sql`UPDATE cadenas_productivas SET activo = false, updated_at = NOW() WHERE id = ${id}`;
  return c.json({ message: "Cadena desactivada" });
});

export default app;
