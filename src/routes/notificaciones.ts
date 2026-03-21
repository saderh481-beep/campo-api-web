import { Hono } from "hono";
import { sql } from "@/db";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { JwtPayload } from "@/lib/jwt";

const app = new Hono<{
  Variables: {
    user: JwtPayload;
  };
}>();
app.use("*", authMiddleware, requireRole("administrador", "coordinador"));

app.get("/", async (c) => {
  const user = c.get("user");
  const notificaciones = await sql`
    SELECT id, destino_id, destino_tipo, tipo, titulo, cuerpo, leido,
           enviado_push, enviado_email, created_at
    FROM notificaciones
    WHERE destino_id = ${user.sub} AND leido = false
    ORDER BY created_at DESC
  `;
  return c.json(notificaciones);
});

app.patch("/:id/leer", async (c) => {
  const { id } = c.req.param();
  const user = c.get("user");
  await sql`
    UPDATE notificaciones SET leido = true
    WHERE id = ${id} AND destino_id = ${user.sub}
  `;
  return c.json({ message: "Marcada como leída" });
});

app.patch("/leer-todas", async (c) => {
  const user = c.get("user");
  await sql`
    UPDATE notificaciones SET leido = true WHERE destino_id = ${user.sub}
  `;
  return c.json({ message: "Todas marcadas como leídas" });
});

export default app;
