import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { hash } from "bcryptjs";
import { randomInt } from "node:crypto";
import { authMiddleware, requireRole } from "@/middleware/auth";
import { createUsuario, deactivateUsuario, deleteUsuarioFisico, existsUsuarioByCorreo, listUsuarios, updateUsuario, type UsuarioInput, type UsuarioUpdateInput } from "@/models/usuarios.model";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("admin"));

app.get("/", async (c) => {
  const rows = await listUsuarios();
  return c.json(rows);
});

app.post(
  "/",
  zValidator(
    "json",
    z.object({
      correo: z.string().email(),
      nombre: z.string().min(2),
      rol: z.enum(["tecnico", "coordinador", "admin"]),
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    if (await existsUsuarioByCorreo(body.correo)) {
      return c.json({ error: "El correo ya está registrado" }, 409);
    }
    const codigo = randomInt(10000, 100000).toString();
    const hashCodigo = await hash(codigo, 12);
    const input = { ...body, codigo, hash_codigo_acceso: hashCodigo } as unknown;
    const row = await createUsuario(input as Parameters<typeof createUsuario>[0]);
    return c.json({ ...row, codigo }, 201);
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
      rol: z.enum(["tecnico", "coordinador", "admin"]).optional(),
      codigo_acceso: z.string().regex(/^\d{5,6}$/).optional(),
      activo: z.boolean().optional(),
    })
  ),
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");
    if (body.correo && await existsUsuarioByCorreo(body.correo, id)) {
      return c.json({ error: "El correo ya está registrado" }, 409);
    }
    const updateInput: UsuarioUpdateInput & { hash_codigo_acceso?: string | null } = { ...body };
    if (body.codigo_acceso) {
      updateInput.hash_codigo_acceso = await hash(body.codigo_acceso, 12);
    }
    const row = await updateUsuario(id, updateInput);
    if (!row) return c.json({ error: "Usuario no encontrado" }, 404);
    return c.json(row);
  }
);

app.delete(
  "/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.param();
    const row = await deactivateUsuario(id);
    if (!row) return c.json({ error: "Usuario no encontrado" }, 404);
    return c.json({ message: "Usuario desactivado" });
  }
);

app.delete(
  "/:id/force",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.param();
    const row = await deleteUsuarioFisico(id);
    if (!row) return c.json({ error: "Usuario no encontrado" }, 404);
    return c.json({ message: "Usuario eliminado" });
  }
);

export default app;