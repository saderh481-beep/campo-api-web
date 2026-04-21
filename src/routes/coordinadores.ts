import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { randomInt } from "node:crypto";
import { sql } from "@/infrastructure/db";
import { authMiddleware, requireRole } from "@/routes/middlewares/middleware/auth";
import { createUsuario, deactivateUsuario, existsUsuarioByCorreo, listUsuarios } from "@/data/models/usuarios.model";
import type { AppEnv } from "@/types/http";
import { hashSHA512 } from "@/infrastructure/lib/crypto-utils";

const app = new Hono<AppEnv>();

app.get("/me", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const [row] = await sql`
      SELECT id, nombre, correo, rol, telefono, activo, created_at
      FROM usuarios
      WHERE id = ${user.sub}
    `;
    if (!row) return c.json({ error: "Usuario no encontrado" }, 404);
    return c.json(row);
  } catch (e) {
    console.error("[Coordinadores] Error al obtener:", e);
    return c.json({ error: "Error al obtener usuario" }, 500);
  }
});

app.use("*", authMiddleware, requireRole("admin", "coordinador"));

app.get("/", async (c) => {
  try {
    const rows = await listUsuarios();
    return c.json(rows);
  } catch (e) {
    console.error("[Coordinadores] Error al listar:", e);
    return c.json({ error: "Error al obtener coordinadores" }, 500);
  }
});

app.post(
  "/",
  requireRole("admin"),
  zValidator(
    "json",
    z.object({
      correo: z.string().email(),
      nombre: z.string().min(2),
      telefono: z.string().optional(),
    })
  ),
  async (c) => {
    try {
      const body = c.req.valid("json");

      if (await existsUsuarioByCorreo(body.correo)) {
        return c.json({ error: "El correo ya está registrado" }, 409);
      }

      const codigo = randomInt(10000, 100000).toString();
      const hashCodigo = hashSHA512(codigo);

      const input = {
        correo: body.correo,
        nombre: body.nombre,
        rol: "coordinador",
        telefono: body.telefono ?? null,
        codigo_acceso: codigo,
        hash_codigo_acceso: hashCodigo,
      } as Parameters<typeof createUsuario>[0];

      const row = await createUsuario(input);
      if (!row) return c.json({ error: "Error al crear coordinador" }, 500);

      return c.json({ ...row, codigo }, 201);
    } catch (e) {
      console.error("[Coordinadores] Error al crear:", e);
      return c.json({ error: "Error al crear coordinador" }, 500);
    }
  }
);

app.patch(
  "/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2).optional(),
      correo: z.string().email().optional(),
      telefono: z.string().optional(),
      activo: z.boolean().optional(),
    })
  ),
  async (c) => {
    try {
      const { id } = c.req.param();
      const body = c.req.valid("json");
      if (body.correo && await existsUsuarioByCorreo(body.correo, id)) {
        return c.json({ error: "El correo ya está registrado" }, 409);
      }
      const [row] = await sql`
        UPDATE usuarios SET
          nombre = COALESCE(${body.nombre ?? null}, nombre),
          correo = COALESCE(${body.correo ?? null}, correo),
          telefono = COALESCE(${body.telefono ?? null}, telefono),
          activo = COALESCE(${body.activo ?? null}, activo),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, nombre, correo, rol, telefono, activo, created_at
      `;
      if (!row) return c.json({ error: "Coordinador no encontrado" }, 404);
      return c.json(row);
    } catch (e) {
      console.error("[Coordinadores] Error al actualizar:", e);
      return c.json({ error: "Error al actualizar coordinador" }, 500);
    }
  }
);

app.delete(
  "/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = c.req.param();
      const row = await deactivateUsuario(id);
      if (!row) return c.json({ error: "Coordinador no encontrado" }, 404);
      return c.json({ message: "Coordinador desactivado" });
    } catch (e) {
      console.error("[Coordinadores] Error al desactivar:", e);
      return c.json({ error: "Error al desactivar coordinador" }, 500);
    }
  }
);

export default app;