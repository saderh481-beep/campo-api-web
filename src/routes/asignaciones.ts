import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { AppEnv } from "@/types/http";
import {
  deleteAsignacionActividad,
  deleteAsignacionBeneficiario,
  deleteAsignacionCoordinadorTecnico,
  getAsignacionActividadById,
  getAsignacionBeneficiarioById,
  getAsignacionCoordinadorTecnico,
  getAsignacionCoordinadorTecnicoByTecnicoId,
  getAsignacionesActividad,
  getAsignacionesBeneficiario,
  getAsignacionesCoordinadorTecnico,
  patchAsignacionActividad,
  patchAsignacionBeneficiario,
  patchAsignacionCoordinadorTecnico,
  postAsignacionActividad,
  postAsignacionBeneficiario,
  postAsignacionCoordinadorTecnico,
} from "@/controllers/asignaciones.controller";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("administrador"));

app.get(
  "/coordinador-tecnico",
  zValidator("query", z.object({ tecnico_id: z.string().uuid() })),
  getAsignacionCoordinadorTecnico
);

app.get(
  "/coordinador-tecnico/lista",
  zValidator("query", z.object({ tecnico_id: z.string().uuid().optional() })),
  getAsignacionesCoordinadorTecnico
);

app.get(
  "/coordinador-tecnico/:tecnico_id",
  zValidator("param", z.object({ tecnico_id: z.string().uuid() })),
  getAsignacionCoordinadorTecnicoByTecnicoId
);

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

app.delete(
  "/coordinador-tecnico/:tecnico_id",
  zValidator("param", z.object({ tecnico_id: z.string().uuid() })),
  deleteAsignacionCoordinadorTecnico
);

app.patch(
  "/coordinador-tecnico/:tecnico_id",
  zValidator("param", z.object({ tecnico_id: z.string().uuid() })),
  zValidator(
    "json",
    z.object({
      coordinador_id: z.string().uuid().optional(),
      fecha_limite: z.string().datetime().optional(),
      activo: z.boolean().optional(),
    })
  ),
  (c) => patchAsignacionCoordinadorTecnico(c, c.req.valid("json"))
);

app.get(
  "/beneficiario",
  zValidator(
    "query",
    z.object({
      tecnico_id: z.string().uuid().optional(),
      beneficiario_id: z.string().uuid().optional(),
      activo: z.enum(["true", "false"]).optional(),
    })
  ),
  getAsignacionesBeneficiario
);

app.get(
  "/beneficiario/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  getAsignacionBeneficiarioById
);

app.post(
  "/beneficiario",
  zValidator(
    "json",
    z.object({ tecnico_id: z.string().uuid(), beneficiario_id: z.string().uuid() })
  ),
  (c) => postAsignacionBeneficiario(c, c.req.valid("json"))
);

app.delete(
  "/beneficiario/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  deleteAsignacionBeneficiario
);

app.patch(
  "/beneficiario/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator(
    "json",
    z.object({
      tecnico_id: z.string().uuid().optional(),
      beneficiario_id: z.string().uuid().optional(),
      activo: z.boolean().optional(),
    })
  ),
  (c) => patchAsignacionBeneficiario(c, c.req.valid("json"))
);

app.get(
  "/actividad",
  zValidator(
    "query",
    z.object({
      tecnico_id: z.string().uuid().optional(),
      actividad_id: z.string().uuid().optional(),
      activo: z.enum(["true", "false"]).optional(),
    })
  ),
  getAsignacionesActividad
);

app.get(
  "/actividad/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  getAsignacionActividadById
);

app.post(
  "/actividad",
  zValidator(
    "json",
    z.object({ tecnico_id: z.string().uuid(), actividad_id: z.string().uuid() })
  ),
  (c) => postAsignacionActividad(c, c.req.valid("json"))
);

app.delete(
  "/actividad/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  deleteAsignacionActividad
);

app.patch(
  "/actividad/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator(
    "json",
    z.object({
      tecnico_id: z.string().uuid().optional(),
      actividad_id: z.string().uuid().optional(),
      activo: z.boolean().optional(),
    })
  ),
  (c) => patchAsignacionActividad(c, c.req.valid("json"))
);

export default app;
