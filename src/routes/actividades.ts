import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { AppEnv } from "@/types/http";
import { deleteActividad, getActividades, patchActividad, postActividad } from "@/controllers/actividades.controller";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware);

app.get("/", requireRole("administrador", "coordinador"), getActividades);

app.post(
  "/",
  requireRole("administrador"),
  zValidator("json", z.object({ nombre: z.string().min(2), descripcion: z.string().optional() })),
  (c) => postActividad(c, c.req.valid("json"))
);

app.patch(
  "/:id",
  requireRole("administrador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator(
    "json",
    z.object({ nombre: z.string().min(2).optional(), descripcion: z.string().optional() })
  ),
  (c) => patchActividad(c, c.req.valid("json"))
);

app.delete(
  "/:id",
  requireRole("administrador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  deleteActividad
);

export default app;
