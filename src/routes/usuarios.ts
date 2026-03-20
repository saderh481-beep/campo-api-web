import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "@/db";
import { authMiddleware, requireRole } from "@/middleware/auth";

const app = new Hono();

app.use("*", authMiddleware);
app.use("*", requireRole("admin"));

app.get("/", async (c) => {
  const usuarios = await sql`
    SELECT id, nombre, correo, rol, activo, creado_en
    FROM usuarios
    ORDER BY creado_en DESC
  `;
  return c.json(usuarios);
});

app.post(
  "/",
  zValidator(
    "json",
    z.object({
      correo: z.string().email(),
      nombre: z.string().min(2),
      rol: z.enum(["admin", "coordinador"]),
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const [existe] = await sql`SELECT id FROM usuarios WHERE correo = ${body.correo}`;
    if (existe) return c.json({ error: "El correo ya está registrado" }, 409);

    const [nuevo] = await sql`
      INSERT INTO usuarios (correo, nombre, rol)
      VALUES (${body.correo}, ${body.nombre}, ${body.rol})
      RETURNING id, nombre, correo, rol, activo, creado_en
    `;
    return c.json(nuevo, 201);
  }
);

app.patch(
  "/:id",
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2).optional(),
      correo: z.string().email().optional(),
      rol: z.enum(["admin", "coordinador"]).optional(),
    })
  ),
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");

    const [usuario] = await sql`SELECT id FROM usuarios WHERE id = ${id}`;
    if (!usuario) return c.json({ error: "Usuario no encontrado" }, 404);

    if (body.correo) {
      const [dupCorreo] = await sql`
        SELECT id FROM usuarios
        WHERE correo = ${body.correo} AND id <> ${id}
      `;
      if (dupCorreo) return c.json({ error: "El correo ya está registrado" }, 409);
    }

    const [actualizado] = await sql`
      UPDATE usuarios SET
        nombre = COALESCE(${body.nombre ?? null}, nombre),
        correo = COALESCE(${body.correo ?? null}, correo),
        rol    = COALESCE(${body.rol ?? null}, rol),
        actualizado_en = NOW()
      WHERE id = ${id}
      RETURNING id, nombre, correo, rol, activo
    `;
    return c.json(actualizado);
  }
);

app.delete("/:id", async (c) => {
  const { id } = c.req.param();
  const user = c.get("user");
  if (user.sub === id) return c.json({ error: "No puedes desactivar tu propia cuenta" }, 400);

  await sql`UPDATE usuarios SET activo = false, actualizado_en = NOW() WHERE id = ${id}`;
  return c.json({ message: "Usuario desactivado" });
});

export default app;
