import { Hono } from "hono";
import {
  getNotificaciones,
  patchNotificacionLeida,
  patchNotificacionesLeerTodas,
} from "@/controllers/notificaciones.controller";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("administrador", "tecnico"));

app.get("/", getNotificaciones);

app.patch("/:id/leer", patchNotificacionLeida);

app.patch("/leer-todas", patchNotificacionesLeerTodas);

export default app;
