import { Hono } from "hono";
import { sql } from "@/db";
import { authMiddleware, requireRole } from "@/middleware/auth";

const app = new Hono();
app.use("*", authMiddleware, requireRole("admin", "coordinador"));

app.get("/", async (c) => {
  const user = c.get("user");
  const notificaciones = await sql`
    SELECT id, titulo, mensaje, leida, creado_en
    FROM notificaciones
    WHERE destinatario_id = ${user.sub} AND leida = false
    ORDER BY creado_en DESC
  `;
  return c.json(notificaciones);
});

app.patch("/:id/leer", async (c) => {
  const { id } = c.req.param();
  const user = c.get("user");
  await sql`
    UPDATE notificaciones SET leida = true
    WHERE id = ${id} AND destinatario_id = ${user.sub}
  `;
  return c.json({ message: "Marcada como leída" });
});

app.patch("/leer-todas", async (c) => {
  const user = c.get("user");
  await sql`
    UPDATE notificaciones SET leida = true WHERE destinatario_id = ${user.sub}
  `;
  return c.json({ message: "Todas marcadas como leídas" });
});

export default app;
