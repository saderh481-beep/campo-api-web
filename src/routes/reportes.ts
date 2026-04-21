import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "@/routes/middlewares/middleware/auth";
import { canAccessTecnicoReporte, getBitacorasPorTecnico, getReporteMensualAdmin, getReporteMensualCoordinador } from "@/data/models/reportes.model";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("admin", "coordinador"));

app.get(
  "/mensual",
  zValidator(
    "query",
    z.object({
      mes: z.coerce.number().int().min(1).max(12).optional(),
      anio: z.coerce.number().int().min(1900).max(3000).optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const { mes, anio } = c.req.valid("query");
    const mesActual = mes ?? new Date().getMonth() + 1;
    const anioActual = anio ?? new Date().getFullYear();

    const rows = user.rol === "admin"
      ? await getReporteMensualAdmin(mesActual, anioActual)
      : await getReporteMensualCoordinador(user.sub, mesActual, anioActual);
    return c.json(rows);
  }
);

app.get(
  "/tecnico/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator(
    "query",
    z.object({
      desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
  ),
  async (c) => {
    const { id } = c.req.param();
    const { desde, hasta } = c.req.valid("query");
    const user = c.get("user");

    const hasAccess = await canAccessTecnicoReporte(user.rol, id, user.sub);
    if (!hasAccess) return c.json({ error: "Sin permisos para este reporte" }, 403);

    const rows = await getBitacorasPorTecnico(id, desde, hasta);
    return c.json(rows);
  }
);

export default app;