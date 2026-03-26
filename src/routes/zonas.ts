import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { deleteZona, getZonas, patchZona, postZona } from "@/controllers/zonas.controller";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("administrador"));

app.get("/", getZonas);

app.post(
  "/",
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2),
      descripcion: z.string().optional(),
    })
  ),
  (c) => postZona(c, c.req.valid("json"))
);

app.patch(
  "/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2).optional(),
      descripcion: z.string().optional(),
    })
  ),
  (c) => patchZona(c, c.req.valid("json"))
);

app.delete(
  "/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  deleteZona
);

export default app;
