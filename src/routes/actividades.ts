import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "@/routes/middlewares/middleware/auth";
import { createActividad, deactivateActividad, listActividades, updateActividad, type ActividadInput, type ActividadUpdateInput } from "@/data/models/actividades.model";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware);

app.get("/", requireRole("admin", "coordinador"), async (c) => {
  const rows = await listActividades();
  return c.json(rows);
});

app.post(
  "/",
  requireRole("admin", "coordinador"),
  zValidator("json", z.object({ nombre: z.string().min(2), descripcion: z.string().optional() })),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json") as ActividadInput;
    const row = await createActividad(body, user.sub);
    return c.json(row, 201);
  }
);

app.patch(
  "/:id",
  requireRole("admin", "coordinador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator("json", z.object({ nombre: z.string().min(2).optional(), descripcion: z.string().optional() })),
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json") as ActividadUpdateInput;
    const row = await updateActividad(id, body);
    if (!row) return c.json({ error: "Actividad no encontrada" }, 404);
    return c.json(row);
  }
);

app.delete(
  "/:id",
  requireRole("admin", "coordinador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.param();
    const row = await deactivateActividad(id);
    if (!row) return c.json({ error: "Actividad no encontrada" }, 404);
    return c.json({ message: "Actividad desactivada" });
  }
);

export default app;