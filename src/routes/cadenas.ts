import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "@/middleware/auth";
import { createCadena, deactivateCadena, listCadenas, updateCadena, type CadenaInput, type CadenaUpdateInput } from "@/models/cadenas.model";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware);

app.get("/", requireRole("admin", "coordinador"), async (c) => {
  const rows = await listCadenas();
  return c.json(rows);
});

app.post(
  "/",
  requireRole("admin"),
  zValidator("json", z.object({ nombre: z.string().min(2), descripcion: z.string().optional() })),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json") as CadenaInput;
    const row = await createCadena(body, user.sub);
    return c.json(row, 201);
  }
);

app.patch(
  "/:id",
  requireRole("admin"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator("json", z.object({ nombre: z.string().min(2).optional(), descripcion: z.string().optional() })),
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json") as CadenaUpdateInput;
    const row = await updateCadena(id, body);
    if (!row) return c.json({ error: "Cadena no encontrada" }, 404);
    return c.json(row);
  }
);

app.delete(
  "/:id",
  requireRole("admin"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.param();
    const row = await deactivateCadena(id);
    if (!row) return c.json({ error: "Cadena no encontrada" }, 404);
    return c.json({ message: "Cadena desactivada" });
  }
);

export default app;
