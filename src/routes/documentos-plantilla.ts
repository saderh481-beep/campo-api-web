import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "@/db";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { JwtPayload } from "@/lib/jwt";

const app = new Hono<{ Variables: { user: JwtPayload } }>();
app.use("*", authMiddleware, requireRole("administrador", "coordinador"));

// GET / — todos los documentos (incluyendo inactivos, para gestión)
app.get("/", requireRole("administrador"), async (_c) => {
  const plantilla = await sql`
    SELECT id, nombre, descripcion, obligatorio, orden, activo, created_at, updated_at
    FROM documentos_plantilla
    ORDER BY orden, nombre
  `;
  return _c.json(plantilla);
});

// GET /activos — solo los activos, ordenados (admin + coordinador + consulta app)
app.get("/activos", async (c) => {
  const plantilla = await sql`
    SELECT id, nombre, descripcion, obligatorio, orden
    FROM documentos_plantilla
    WHERE activo = true
    ORDER BY orden, nombre
  `;
  return c.json(plantilla);
});

// POST / — crear documento (solo admin)
app.post(
  "/",
  requireRole("administrador"),
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2),
      descripcion: z.string().optional(),
      obligatorio: z.boolean().default(true),
      orden: z.number().int().min(0).default(0),
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const user = c.get("user");
    const [nuevo] = await sql`
      INSERT INTO documentos_plantilla (nombre, descripcion, obligatorio, orden, created_by)
      VALUES (
        ${body.nombre},
        ${body.descripcion ?? null},
        ${body.obligatorio},
        ${body.orden},
        ${user.sub}
      )
      RETURNING id, nombre, descripcion, obligatorio, orden, activo, created_at, updated_at
    `;
    return c.json(nuevo, 201);
  }
);

// PATCH /:id — editar documento (solo admin)
app.patch(
  "/:id",
  requireRole("administrador"),
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2).optional(),
      descripcion: z.string().optional(),
      obligatorio: z.boolean().optional(),
      orden: z.number().int().min(0).optional(),
    })
  ),
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");
    const [actualizado] = await sql`
      UPDATE documentos_plantilla SET
        nombre      = COALESCE(${body.nombre ?? null}, nombre),
        descripcion = COALESCE(${body.descripcion ?? null}, descripcion),
        obligatorio = COALESCE(${body.obligatorio ?? null}, obligatorio),
        orden       = COALESCE(${body.orden ?? null}, orden),
        updated_at  = NOW()
      WHERE id = ${id}
      RETURNING id, nombre, descripcion, obligatorio, orden, activo, created_at, updated_at
    `;
    if (!actualizado) return c.json({ error: "Documento no encontrado" }, 404);
    return c.json(actualizado);
  }
);

// DELETE /:id — desactivar (soft delete, solo admin)
app.delete("/:id", requireRole("administrador"), async (c) => {
  const { id } = c.req.param();
  const [actualizado] = await sql`
    UPDATE documentos_plantilla SET activo = false, updated_at = NOW()
    WHERE id = ${id} AND activo = true
    RETURNING id
  `;
  if (!actualizado) return c.json({ error: "Documento no encontrado" }, 404);
  return c.json({ message: "Documento desactivado" });
});

export default app;
