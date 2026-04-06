import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "@/middleware/auth";
import { createDocumentoPlantilla, deactivateDocumentoPlantilla, listDocumentosPlantilla, updateDocumentoPlantilla, type DocumentoPlantillaInput, type DocumentoPlantillaUpdateInput } from "@/models/documentos-plantilla.model";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("admin"));

app.get("/", requireRole("admin"), async (c) => {
  const rows = await listDocumentosPlantilla(true);
  return c.json(rows);
});

app.get("/activos", async (c) => {
  const rows = await listDocumentosPlantilla(false);
  return c.json(rows);
});

app.post(
  "/",
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
  async (c) => {
    const body = c.req.valid("json");
    const user = c.get("user");
    const row = await createDocumentoPlantilla(body as DocumentoPlantillaInput, user.sub);
    return c.json(row, 201);
  }
);

app.patch(
  "/:id",
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
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json") as DocumentoPlantillaUpdateInput;
    const row = await updateDocumentoPlantilla(id, body);
    if (!row) return c.json({ error: "Documento no encontrado" }, 404);
    return c.json(row);
  }
);

app.delete(
  "/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.param();
    const row = await deactivateDocumentoPlantilla(id);
    if (!row) return c.json({ error: "Documento no encontrado" }, 404);
    return c.json({ message: "Documento desactivado" });
  }
);

export default app;