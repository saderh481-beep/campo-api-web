import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "@/db";
import { authMiddleware, requireRole } from "@/middleware/auth";

const app = new Hono();
app.use("*", authMiddleware, requireRole("admin", "coordinador"));

app.get("/", async (c) => {
  const cadenas = await sql`
    SELECT id, nombre, descripcion, activo, creado_en FROM cadenas_productivas ORDER BY nombre
  `;
  return c.json(cadenas);
});

app.post(
  "/",
  requireRole("admin"),
  zValidator("json", z.object({ nombre: z.string().min(2), descripcion: z.string().optional() })),
  async (c) => {
    const body = c.req.valid("json");
    const [nueva] = await sql`
      INSERT INTO cadenas_productivas (nombre, descripcion)
      VALUES (${body.nombre}, ${body.descripcion ?? null})
      RETURNING id, nombre, descripcion, activo, creado_en
    `;
    return c.json(nueva, 201);
  }
);

app.patch(
  "/:id",
  requireRole("admin"),
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
        actualizado_en = NOW()
      WHERE id = ${id}
      RETURNING id, nombre, descripcion, activo
    `;
    if (!actualizado) return c.json({ error: "Cadena no encontrada" }, 404);
    return c.json(actualizado);
  }
);

app.delete("/:id", requireRole("admin"), async (c) => {
  const { id } = c.req.param();
  await sql`UPDATE cadenas_productivas SET activo = false, actualizado_en = NOW() WHERE id = ${id}`;
  return c.json({ message: "Cadena desactivada" });
});

export default app;
