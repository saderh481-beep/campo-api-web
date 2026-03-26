import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { AppEnv } from "@/types/http";
import {
  deleteTecnico,
  getTecnicoById,
  getTecnicos,
  patchTecnicoWithBody,
  postAplicarCortes,
  postCerrarCorte,
  postTecnicoCodigo,
} from "@/controllers/tecnicos.controller";

const app = new Hono<AppEnv>();

app.use("*", authMiddleware);

app.get("/", requireRole("administrador", "coordinador"), getTecnicos);

app.get(
  "/:id",
  requireRole("administrador", "coordinador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  getTecnicoById
);

app.post(
  "/",
  requireRole("administrador"),
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2),
      correo: z.string().email(),
      telefono: z.string().optional(),
      coordinador_id: z.string().uuid(),
      fecha_limite: z.string().datetime(),
    })
  ),
  async (c) => {
    c.req.valid("json");
    return c.json(
      {
        error:
          "La creación de técnicos se realiza desde /usuarios con rol 'tecnico'.",
      },
      405
    );
  }
);

app.patch(
  "/:id",
  requireRole("administrador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2).optional(),
      correo: z.string().email().optional(),
      telefono: z.string().optional(),
      coordinador_id: z.string().uuid().optional(),
      fecha_limite: z.string().datetime().optional(),
    })
  ),
  (c) => {
    const body = c.req.valid("json");
    return patchTecnicoWithBody(c, body);
  }
);

app.post(
  "/:id/codigo",
  requireRole("administrador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  postTecnicoCodigo
);

// POST /aplicar-cortes — batch: aplica estado_corte a todos los vencidos (solo admin)
app.post("/aplicar-cortes", requireRole("administrador"), postAplicarCortes);

// POST /:id/cerrar-corte — cierre manual por coordinador o admin
app.post(
  "/:id/cerrar-corte",
  requireRole("administrador", "coordinador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  postCerrarCorte
);

app.delete(
  "/:id",
  requireRole("administrador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  deleteTecnico
);

export default app;
