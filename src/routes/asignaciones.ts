import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { AppEnv } from "@/types/http";
import {
  deleteAsignacionActividad,
  deleteAsignacionBeneficiario,
  deleteAsignacionCoordinadorTecnico,
  getAsignacionCoordinadorTecnico,
  postAsignacionActividad,
  postAsignacionBeneficiario,
  postAsignacionCoordinadorTecnico,
} from "@/controllers/asignaciones.controller";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("administrador"));

app.get("/coordinador-tecnico", getAsignacionCoordinadorTecnico);

app.post(
  "/coordinador-tecnico",
  zValidator(
    "json",
    z.object({
      tecnico_id: z.string().uuid(),
      coordinador_id: z.string().uuid(),
      fecha_limite: z.string().datetime(),
    })
  ),
  (c) => postAsignacionCoordinadorTecnico(c, c.req.valid("json"))
);

app.delete("/coordinador-tecnico/:tecnico_id", deleteAsignacionCoordinadorTecnico);

app.post(
  "/beneficiario",
  zValidator(
    "json",
    z.object({ tecnico_id: z.string().uuid(), beneficiario_id: z.string().uuid() })
  ),
  (c) => postAsignacionBeneficiario(c, c.req.valid("json"))
);

app.delete("/beneficiario/:id", deleteAsignacionBeneficiario);

app.post(
  "/actividad",
  zValidator(
    "json",
    z.object({ tecnico_id: z.string().uuid(), actividad_id: z.string().uuid() })
  ),
  (c) => postAsignacionActividad(c, c.req.valid("json"))
);

app.delete("/actividad/:id", deleteAsignacionActividad);

export default app;
