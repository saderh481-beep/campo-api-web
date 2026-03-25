import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getConfiguracion, getConfiguraciones, putConfiguracion } from "@/controllers/configuraciones.controller";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware);

app.get("/", requireRole("administrador"), getConfiguraciones);

app.get("/:clave", requireRole("administrador"), getConfiguracion);

app.put(
  "/:clave",
  requireRole("administrador"),
  zValidator("json", z.object({ valor: z.record(z.string(), z.unknown()) })),
  (c) => putConfiguracion(c, c.req.valid("json").valor)
);

export default app;
