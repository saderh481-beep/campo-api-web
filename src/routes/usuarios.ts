import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { hash } from "bcryptjs";
import { randomInt } from "node:crypto";
import { sql } from "@/db";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { JwtPayload } from "@/lib/jwt";

const app = new Hono<{
  Variables: {
    user: JwtPayload;
  };
}>();

app.use("*", authMiddleware);
app.use("*", requireRole("administrador"));

function getCodeLengthByRole(rol: string): number {
  if (rol === "tecnico") return 5;
  return 6;
}

async function generarCodigoAccesoUnico(length: number): Promise<string> {
  const min = 10 ** (length - 1);
  const max = 10 ** length;

  while (true) {
    const candidate = randomInt(min, max).toString();
    const [exists] = await sql`SELECT id FROM usuarios WHERE codigo_acceso = ${candidate} LIMIT 1`;
    if (!exists) return candidate;
  }
}

app.get("/", async (c) => {
  const usuarios = await sql`
    SELECT id, nombre, correo, rol, activo, created_at, updated_at
    FROM usuarios
    ORDER BY created_at DESC
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
      rol: z.enum(["tecnico", "coordinador", "administrador"]),
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const [existe] = await sql`SELECT id FROM usuarios WHERE correo = ${body.correo}`;
    if (existe) return c.json({ error: "El correo ya está registrado" }, 409);

    const length = getCodeLengthByRole(body.rol);
    const codigoAcceso = await generarCodigoAccesoUnico(length);
    const hashCodigoAcceso = await hash(codigoAcceso, 12);

    const [nuevo] = await sql`
      INSERT INTO usuarios (correo, nombre, rol, codigo_acceso, hash_codigo_acceso)
      VALUES (${body.correo}, ${body.nombre}, ${body.rol}, ${codigoAcceso}, ${hashCodigoAcceso})
      RETURNING id, nombre, correo, rol, activo, created_at, updated_at
    `;

    return c.json({ ...nuevo, codigo_acceso: codigoAcceso }, 201);
  }
);

app.patch(
  "/:id",
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2).optional(),
      correo: z.string().email().optional(),
      rol: z.enum(["tecnico", "coordinador", "administrador"]).optional(),
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
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, nombre, correo, rol, activo, created_at, updated_at
    `;
    return c.json(actualizado);
  }
);

app.delete("/:id", async (c) => {
  const { id } = c.req.param();
  const user = c.get("user");
  if (user.sub === id) return c.json({ error: "No puedes desactivar tu propia cuenta" }, 400);

  await sql`UPDATE usuarios SET activo = false, updated_at = NOW() WHERE id = ${id}`;
  return c.json({ message: "Usuario desactivado" });
});

export default app;
