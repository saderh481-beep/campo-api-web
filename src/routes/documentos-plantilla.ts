import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  deleteDocumentoPlantilla,
  getDocumentosPlantilla,
  getDocumentosPlantillaActivos,
  patchDocumentoPlantilla,
  postDocumentoPlantilla,
} from "@/controllers/documentos-plantilla.controller";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("administrador"));

app.get("/", requireRole("administrador"), getDocumentosPlantilla);

app.get("/activos", getDocumentosPlantillaActivos);

app.post(
  "/",
  requireRole("administrador"),
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2),
      descripcion: z.string().optional(),
      obligatorio: z.boolean().default(true),
      orden: z.number().int().min(0).default(0),
      configuracion: z.record(z.string(), z.unknown()).optional(),
    })
  ),
  (c) => postDocumentoPlantilla(c, c.req.valid("json"))
);

app.patch(
  "/:id",
  requireRole("administrador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2).optional(),
      descripcion: z.string().optional(),
      obligatorio: z.boolean().optional(),
      orden: z.number().int().min(0).optional(),
      configuracion: z.record(z.string(), z.unknown()).optional(),
    })
  ),
  (c) => patchDocumentoPlantilla(c, c.req.valid("json"))
);

app.delete(
  "/:id",
  requireRole("administrador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  deleteDocumentoPlantilla
);

export default app;
