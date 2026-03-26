import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { deleteLocalidad, getLocalidades, patchLocalidad, postLocalidad } from "@/controllers/localidades.controller";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("administrador"));

app.get("/", getLocalidades);

app.post(
  "/",
  requireRole("administrador"),
  zValidator(
    "json",
    z.object({
      zona_id: z.string().uuid().optional(),
      municipio: z.string().min(2),
      nombre: z.string().min(2),
      cp: z
        .string()
        .regex(/^\d{5}$/, "El CP debe tener exactamente 5 dígitos")
        .optional(),
    })
  ),
  (c) => postLocalidad(c, c.req.valid("json"))
);

app.patch(
  "/:id",
  requireRole("administrador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator(
    "json",
    z.object({
      zona_id: z.string().uuid().optional(),
      municipio: z.string().min(2).optional(),
      nombre: z.string().min(2).optional(),
      cp: z
        .string()
        .regex(/^\d{5}$/, "El CP debe tener exactamente 5 dígitos")
        .optional(),
    })
  ),
  (c) => patchLocalidad(c, c.req.valid("json"))
);

app.delete(
  "/:id",
  requireRole("administrador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  deleteLocalidad
);

export default app;
