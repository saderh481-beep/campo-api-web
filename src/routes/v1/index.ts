import { Hono } from "hono";

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
import dashboardRoutes from "@/routes/dashboard";
import zonasRoutes from "@/routes/zonas";
import localidadesRoutes from "@/routes/localidades";
import configuracionesRoutes from "@/routes/configuraciones";
import documentosPlantillaRoutes from "@/routes/documentos-plantilla";
import documentosPdfRoutes from "@/routes/documentos-pdf";

const v1 = new Hono();

v1.route("/auth", authRoutes);
v1.route("/usuarios", usuariosRoutes);
v1.route("/tecnicos", tecnicosRoutes);
v1.route("/cadenas-productivas", cadenasRoutes);
v1.route("/actividades", actividadesRoutes);
v1.route("/beneficiarios", beneficiariosRoutes);
v1.route("/asignaciones", asignacionesRoutes);
v1.route("/bitacoras", bitacorasRoutes);
v1.route("/reportes", reportesRoutes);
v1.route("/archive", archiveRoutes);
v1.route("/notificaciones", notificacionesRoutes);
v1.route("/dashboard", dashboardRoutes);
v1.route("/zonas", zonasRoutes);
v1.route("/localidades", localidadesRoutes);
v1.route("/configuraciones", configuracionesRoutes);
v1.route("/documentos-plantilla", documentosPlantillaRoutes);
v1.route("/documentos-pdf", documentosPdfRoutes);

export default v1;
