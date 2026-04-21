import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "@/routes/middlewares/middleware/auth";
import { listDocumentos, getDocumentoByKey, createDocumento, updateDocumento, deleteDocumento } from "@/data/models/documento.model";
import type { AppEnv } from "@/types/http";

const DocInput = z.object({
  titulo: z.string().min(1),
  contenido: z.string().min(1),
  categoria: z.string().optional(),
});

const DocPatch = z.object({
  titulo: z.string().min(1).optional(),
  contenido: z.string().min(1).optional(),
  categoria: z.string().optional(),
});

const app = new Hono<AppEnv>();
app.use("*", authMiddleware);

app.get("/", async (c) => {
  const rows = await listDocumentos();
  return c.json({ documentos: rows });
});

app.get("/:key", async (c) => {
  const { key } = c.req.param();
  const doc = await getDocumentoByKey(key);
  if (!doc) return c.json({ error: "Documento no encontrado" }, 404);
  return c.json(doc);
});

app.post(
  "/:key",
  requireRole("admin"),
  zValidator("json", DocInput),
  async (c) => {
    const { key } = c.req.param();
    const body = c.req.valid("json");
    const user = c.get("user");
    const doc = await createDocumento(key, body.titulo, body.contenido, user.sub, body.categoria);
    return c.json(doc, 201);
  }
);

app.patch(
  "/:key",
  requireRole("admin"),
  zValidator("json", DocPatch),
  async (c) => {
    const { key } = c.req.param();
    const body = c.req.valid("json");
    const doc = await updateDocumento(key, body);
    if (!doc) return c.json({ error: "Documento no encontrado" }, 404);
    return c.json(doc);
  }
);

app.delete(
  "/:key",
  requireRole("admin"),
  async (c) => {
    const { key } = c.req.param();
    const deleted = await deleteDocumento(key);
    if (!deleted) return c.json({ error: "Documento no encontrado" }, 404);
    return c.json({ message: "Documento eliminado" });
  }
);

export default app;