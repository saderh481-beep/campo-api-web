import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { AppEnv } from "@/types/http";
import { deleteUsuario, getUsuarios, patchUsuario, postUsuario, deleteUsuarioFisico } from "@/controllers/usuarios.controller";

const app = new Hono<AppEnv>();

app.use("*", authMiddleware);
app.use("*", requireRole("administrador"));

app.get("/", getUsuarios);

app.post(
  "/",
  zValidator(
    "json",
    z.object({
      correo: z.string().email(),
      nombre: z.string().min(2),
      rol: z.enum(["tecnico", "coordinador", "administrador"]),
      telefono: z.string().optional(),
    })
  ),
  (c) => postUsuario(c, c.req.valid("json"))
);

app.patch(
  "/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2).optional(),
      correo: z.string().email().optional(),
      rol: z.enum(["tecnico", "coordinador", "administrador"]).optional(),
      codigo_acceso: z.string().regex(/^\d{5,6}$/).optional(),
      telefono: z.string().optional(),
      activo: z.boolean().optional(),
    })
  ),
  (c) => patchUsuario(c, c.req.valid("json"))
);

app.delete(
  "/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  deleteUsuario
);

app.delete(
  "/:id/force",
  zValidator("param", z.object({ id: z.string().uuid() })),
  deleteUsuarioFisico
);

export default app;
