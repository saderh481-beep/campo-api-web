import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "@/db";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { JwtPayload } from "@/lib/jwt";

const app = new Hono<{ Variables: { user: JwtPayload } }>();
app.use("*", authMiddleware, requireRole("administrador", "coordinador"));

app.get("/", async (_c) => {
  const localidades = await sql`
    SELECT id, municipio, nombre, cp, activo, created_at, updated_at
    FROM localidades
    WHERE activo = true
    ORDER BY municipio, nombre
  `;
  return _c.json(localidades);
});

app.post(
  "/",
  requireRole("administrador"),
  zValidator(
    "json",
    z.object({
      municipio: z.string().min(2),
      nombre: z.string().min(2),
      cp: z
        .string()
        .regex(/^\d{5}$/, "El CP debe tener exactamente 5 dígitos")
        .optional(),
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const user = c.get("user");
    const [nueva] = await sql`
      INSERT INTO localidades (municipio, nombre, cp, created_by)
      VALUES (${body.municipio}, ${body.nombre}, ${body.cp ?? null}, ${user.sub})
      RETURNING id, municipio, nombre, cp, activo, created_at, updated_at
    `;
    return c.json(nueva, 201);
  }
);

app.patch(
  "/:id",
  requireRole("administrador"),
  zValidator(
    "json",
    z.object({
      municipio: z.string().min(2).optional(),
      nombre: z.string().min(2).optional(),
      cp: z
        .string()
        .regex(/^\d{5}$/, "El CP debe tener exactamente 5 dígitos")
        .optional(),
    })
  ),
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");
    const [actualizada] = await sql`
      UPDATE localidades SET
        municipio  = COALESCE(${body.municipio ?? null}, municipio),
        nombre     = COALESCE(${body.nombre ?? null}, nombre),
        cp         = COALESCE(${body.cp ?? null}, cp),
        updated_at = NOW()
      WHERE id = ${id} AND activo = true
      RETURNING id, municipio, nombre, cp, activo, created_at, updated_at
    `;
    if (!actualizada) return c.json({ error: "Localidad no encontrada" }, 404);
    return c.json(actualizada);
  }
);

app.delete("/:id", requireRole("administrador"), async (c) => {
  const { id } = c.req.param();
  const [actualizada] = await sql`
    UPDATE localidades SET activo = false, updated_at = NOW()
    WHERE id = ${id} AND activo = true
    RETURNING id
  `;
  if (!actualizada) return c.json({ error: "Localidad no encontrada" }, 404);
  return c.json({ message: "Localidad desactivada" });
});

export default app;
