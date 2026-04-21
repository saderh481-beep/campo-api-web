import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "@/routes/middlewares/middleware/auth";
import { findConfiguracionByClave, listConfiguraciones, updateConfiguracion } from "@/data/models/configuraciones.model";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware);

app.get("/", requireRole("admin"), async (c) => {
  const rows = await listConfiguraciones();
  return c.json(rows);
});

app.get("/:clave", requireRole("admin"), async (c) => {
  const { clave } = c.req.param();
  const row = await findConfiguracionByClave(clave);
  if (!row) return c.json({ error: "Configuración no encontrada" }, 404);
  return c.json(row);
});

app.put(
  "/:clave",
  requireRole("admin"),
  zValidator("json", z.object({ valor: z.record(z.string(), z.unknown()) })),
  async (c) => {
    const { clave } = c.req.param();
    const { valor } = c.req.valid("json");
    const user = c.get("user");
    const row = await updateConfiguracion(clave, valor, user.sub);
    return c.json(row);
  }
);

export default app;