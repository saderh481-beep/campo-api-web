import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createHash } from "node:crypto";
import { randomInt } from "node:crypto";
import { sql } from "@/db";
import { authMiddleware, requireRole } from "@/middleware/auth";
import { createUsuario, deactivateUsuario, deleteUsuarioFisico, existsUsuarioByCorreo, listUsuarios, updateUsuario, type UsuarioInput, type UsuarioUpdateInput } from "@/models/usuarios.model";
import { upsertTecnicoDetalle } from "@/models/tecnico-detalles.model";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();

function hashSHA512(input: string): string {
  return createHash("sha512").update(input).digest("hex");
}

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
    console.error("[Usuarios] Error al obtener usuario:", e);
    return c.json({ error: "Error al obtener usuario" }, 500);
  }
});

app.use("*", authMiddleware, requireRole("admin"));

app.get("/", async (c) => {
  try {
    const rows = await listUsuarios();
    return c.json(rows);
  } catch (e) {
    console.error("[Usuarios] Error al listar usuarios:", e);
    return c.json({ error: "Error al obtener usuarios" }, 500);
  }
});

app.post(
  "/",
  zValidator(
    "json",
    z.object({
      correo: z.string().email(),
      nombre: z.string().min(2),
      rol: z.enum(["tecnico", "coordinador", "admin"]),
      telefono: z.string().optional(),
      coordinador_id: z.string().uuid().optional(),
      fecha_limite: z.string().min(1).optional(),
    })
  ),
  async (c) => {
    try {
      const body = c.req.valid("json");
      const user = c.get("user");

      if (body.rol === "coordinador" && user.rol !== "admin") {
        return c.json({ error: "Solo los administradores pueden crear coordinadores" }, 403);
      }

      if (body.rol === "tecnico" && body.coordinador_id) {
        const [coordinador] = await sql`SELECT id FROM usuarios WHERE id = ${body.coordinador_id} AND rol = 'coordinador' AND activo = true`;
        if (!coordinador) {
          return c.json({ error: "Coordinador no válido o inactivo" }, 400);
        }
      }

      if (await existsUsuarioByCorreo(body.correo)) {
        return c.json({ error: "El correo ya está registrado" }, 409);
      }

const codigo = randomInt(10000, 100000).toString();
      const hashCodigo = hashSHA512(codigo);

      const input = {
        correo: body.correo,
        nombre: body.nombre,
        rol: body.rol,
        telefono: body.telefono ?? null,
        codigo_acceso: codigo,
        hash_codigo_acceso: hashCodigo,
      } as Parameters<typeof createUsuario>[0];

      const row = await createUsuario(input);
      if (!row) return c.json({ error: "Error al crear usuario" }, 500);

      if (body.rol === "tecnico" && body.coordinador_id && body.fecha_limite) {
        const fecha = new Date(body.fecha_limite);
        if (!isNaN(fecha.getTime())) {
          await upsertTecnicoDetalle({
            tecnico_id: row.id,
            coordinador_id: body.coordinador_id,
            fecha_limite: fecha.toISOString(),
          });
        }
      }

      return c.json({ ...row, codigo }, 201);
    } catch (e) {
      console.error("[Usuarios] Error al crear usuario:", e);
      return c.json({ error: "Error al crear usuario" }, 500);
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
      rol: z.enum(["tecnico", "coordinador", "admin"]).optional(),
      codigo_acceso: z.string().optional(),
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
      const updateInput: UsuarioUpdateInput & { hash_codigo_acceso?: string | null } = { ...body };
      if (body.codigo_acceso) {
        updateInput.hash_codigo_acceso = hashSHA512(body.codigo_acceso);
      }
      const row = await updateUsuario(id, updateInput);
      if (!row) return c.json({ error: "Usuario no encontrado" }, 404);
      return c.json(row);
    } catch (e) {
      console.error("[Usuarios] Error al actualizar usuario:", e);
      return c.json({ error: "Error al actualizar usuario" }, 500);
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
      if (!row) return c.json({ error: "Usuario no encontrado" }, 404);
      return c.json({ message: "Usuario desactivado" });
    } catch (e) {
      console.error("[Usuarios] Error al desactivar usuario:", e);
      return c.json({ error: "Error al desactivar usuario" }, 500);
    }
  }
);

app.delete(
  "/:id/force",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = c.req.param();
      const row = await deleteUsuarioFisico(id);
      if (!row) return c.json({ error: "Usuario no encontrado" }, 404);
      return c.json({ message: "Usuario eliminado" });
    } catch (e) {
      console.error("[Usuarios] Error al eliminar usuario:", e);
      return c.json({ error: "Error al eliminar usuario" }, 500);
    }
  }
);

export default app;