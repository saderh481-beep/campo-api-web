import { Hono } from "hono";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { AppEnv } from "@/types/http";
import { getReporteMensual, getReporteTecnico } from "@/controllers/reportes.controller";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("administrador", "coordinador"));

app.get("/mensual", getReporteMensual);

app.get("/tecnico/:id", getReporteTecnico);

export default app;
