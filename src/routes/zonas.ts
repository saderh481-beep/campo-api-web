import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "@/middleware/auth";
import { createZona, deactivateZona, listZonas, updateZona, type ZonaInput, type ZonaUpdateInput } from "@/models/zonas.model";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("admin"));

app.get("/", async (c) => {
  const rows = await listZonas();
  return c.json(rows);
});

app.post(
  "/",
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2),
      descripcion: z.string().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json") as ZonaInput;
    const row = await createZona(body, user.sub);
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
    })
  ),
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json") as ZonaUpdateInput;
    const row = await updateZona(id, body);
    if (!row) return c.json({ error: "Zona no encontrada" }, 404);
    return c.json(row);
  }
);

app.delete(
  "/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.param();
    const row = await deactivateZona(id);
    if (!row) return c.json({ error: "Zona no encontrada" }, 404);
    return c.json({ message: "Zona desactivada" });
  }
);

export default app;