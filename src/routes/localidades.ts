import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "@/middleware/auth";
import { createLocalidad, deactivateLocalidad, listLocalidades, updateLocalidad, type LocalidadInput, type LocalidadUpdateInput } from "@/models/localidades.model";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("admin"));

app.get("/", async (c) => {
  const rows = await listLocalidades();
  return c.json(rows);
});

app.post(
  "/",
  zValidator(
    "json",
    z.object({
      zona_id: z.string().uuid().optional(),
      municipio: z.string().min(2),
      nombre: z.string().min(2),
      cp: z
        .string()
        .regex(/^\d{5}$/, "El CP debe tener exactamente 5 dígitos")
        .optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json") as LocalidadInput;
    const row = await createLocalidad(body, user.sub);
    return c.json(row, 201);
  }
);

app.patch(
  "/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator(
    "json",
    z.object({
      zona_id: z.string().uuid().optional(),
      municipio: z.string().min(2).optional(),
      nombre: z.string().min(2).optional(),
      cp: z
        .string()
        .regex(/^\d{5}$/, "El CP debe tener exactamente 5 dígitos")
        .optional(),
    })
  ),
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json") as LocalidadUpdateInput;
    const row = await updateLocalidad(id, body);
    if (!row) return c.json({ error: "Localidad no encontrada" }, 404);
    return c.json(row);
  }
);

app.delete(
  "/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.param();
    const row = await deactivateLocalidad(id);
    if (!row) return c.json({ error: "Localidad no encontrada" }, 404);
    return c.json({ message: "Localidad desactivada" });
  }
);

export default app;