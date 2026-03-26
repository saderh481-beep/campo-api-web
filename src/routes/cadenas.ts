import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { AppEnv } from "@/types/http";
import { deleteCadena, getCadenas, patchCadena, postCadena } from "@/controllers/cadenas.controller";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("administrador"));

app.get("/", getCadenas);

app.post(
  "/",
  requireRole("administrador"),
  zValidator("json", z.object({ nombre: z.string().min(2), descripcion: z.string().optional() })),
  (c) => postCadena(c, c.req.valid("json"))
);

app.patch(
  "/:id",
  requireRole("administrador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator(
    "json",
    z.object({ nombre: z.string().min(2).optional(), descripcion: z.string().optional() })
  ),
  (c) => patchCadena(c, c.req.valid("json"))
);

app.delete(
  "/:id",
  requireRole("administrador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  deleteCadena
);

export default app;
