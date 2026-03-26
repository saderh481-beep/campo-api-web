import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { AppEnv } from "@/types/http";
import { deleteDocumentoPdf, getDocumentosPdf, patchDocumentoPdf, postDocumentoPdf } from "@/controllers/documentos-pdf.controller";

const app = new Hono<AppEnv>();

app.use("*", authMiddleware, requireRole("administrador"));
app.get("/", getDocumentosPdf);
app.post("/", postDocumentoPdf);
app.patch(
  "/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator(
    "json",
    z.object({
      clave: z.string().min(2).optional(),
      nombre: z.string().min(2).optional(),
      descripcion: z.string().optional(),
      activo: z.boolean().optional(),
    })
  ),
  (c) => patchDocumentoPdf(c, c.req.valid("json"))
);
app.delete(
  "/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  deleteDocumentoPdf
);

export default app;
