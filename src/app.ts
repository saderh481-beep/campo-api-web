import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import authRoutes from "@/routes/auth";
import usuariosRoutes from "@/routes/usuarios";
import tecnicosRoutes from "@/routes/tecnicos";
import cadenasRoutes from "@/routes/cadenas";
import actividadesRoutes from "@/routes/actividades";
import beneficiariosRoutes from "@/routes/beneficiarios";
import asignacionesRoutes from "@/routes/asignaciones";
import bitacorasRoutes from "@/routes/bitacoras";
import reportesRoutes from "@/routes/reportes";
import archiveRoutes from "@/routes/archive";
import notificacionesRoutes from "@/routes/notificaciones";
import localidadesRoutes from "@/routes/localidades";
import configuracionesRoutes from "@/routes/configuraciones";
import documentosPlantillaRoutes from "@/routes/documentos-plantilla";

const app = new Hono();

app.use("*", logger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/health", (c) => c.json({ status: "ok", service: "api-web", ts: new Date().toISOString() }));

app.route("/auth", authRoutes);
app.route("/usuarios", usuariosRoutes);
app.route("/tecnicos", tecnicosRoutes);
app.route("/cadenas-productivas", cadenasRoutes);
app.route("/actividades", actividadesRoutes);
app.route("/beneficiarios", beneficiariosRoutes);
app.route("/asignaciones", asignacionesRoutes);
app.route("/bitacoras", bitacorasRoutes);
app.route("/reportes", reportesRoutes);
app.route("/archive", archiveRoutes);
app.route("/notificaciones", notificacionesRoutes);
app.route("/localidades", localidadesRoutes);
app.route("/configuraciones", configuracionesRoutes);
app.route("/documentos-plantilla", documentosPlantillaRoutes);

app.notFound((c) => c.json({ error: "Ruta no encontrada" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Error interno del servidor" }, 500);
});

export default app;
