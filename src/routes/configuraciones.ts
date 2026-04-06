import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getConfiguracion, getConfiguraciones, putConfiguracion } from "@/controllers/configuracion.controller";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware);

app.get("/", requireRole("admin"), getConfiguraciones);

app.get("/:clave", requireRole("admin"), getConfiguracion);

app.put(
  "/:clave",
  requireRole("admin"),
  zValidator("json", z.object({ valor: z.record(z.string(), z.unknown()) })),
  (c) => putConfiguracion(c, c.req.valid("json").valor)
);

export default app;
