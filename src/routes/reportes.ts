import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { AppEnv } from "@/types/http";
import { getReporteMensual, getReporteTecnico } from "@/controllers/reportes.controller";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("administrador", "coordinador"));

app.get(
  "/mensual",
  zValidator(
    "query",
    z.object({
      mes: z.coerce.number().int().min(1).max(12).optional(),
      anio: z.coerce.number().int().min(1900).max(3000).optional(),
    })
  ),
  getReporteMensual
);

app.get(
  "/tecnico/:id",
  zValidator(
    "query",
    z.object({
      desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
  ),
  getReporteTecnico
);

export default app;
