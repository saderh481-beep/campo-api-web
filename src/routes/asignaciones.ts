import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "@/db";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { JwtPayload } from "@/lib/jwt";

const app = new Hono<{
  Variables: {
    user: JwtPayload
  }
}>();
app.use("*", authMiddleware, requireRole("admin"));

app.post(
  "/beneficiario",
  zValidator(
    "json",
    z.object({ tecnico_id: z.string().uuid(), beneficiario_id: z.string().uuid() })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const user = c.get("user");
    const [nueva] = await sql`
      INSERT INTO asignaciones_beneficiario (tecnico_id, beneficiario_id, asignado_por)
      VALUES (${body.tecnico_id}, ${body.beneficiario_id}, ${user.sub})
      ON CONFLICT (tecnico_id, beneficiario_id) DO UPDATE SET activo = true, removido_en = NULL
      RETURNING id, tecnico_id, beneficiario_id, activo, creado_en
    `;
    return c.json(nueva, 201);
  }
);

app.delete("/beneficiario/:id", async (c) => {
  const { id } = c.req.param();
  await sql`
    UPDATE asignaciones_beneficiario
    SET activo = false, removido_en = NOW()
    WHERE id = ${id}
  `;
  return c.json({ message: "Asignación removida" });
});

app.post(
  "/actividad",
  zValidator(
    "json",
    z.object({ tecnico_id: z.string().uuid(), actividad_id: z.string().uuid() })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const user = c.get("user");
    const [nueva] = await sql`
      INSERT INTO asignaciones_actividad (tecnico_id, actividad_id, asignado_por)
      VALUES (${body.tecnico_id}, ${body.actividad_id}, ${user.sub})
      ON CONFLICT (tecnico_id, actividad_id) DO UPDATE SET activo = true, removido_en = NULL
      RETURNING id, tecnico_id, actividad_id, activo, creado_en
    `;
    return c.json(nueva, 201);
  }
);

app.delete("/actividad/:id", async (c) => {
  const { id } = c.req.param();
  await sql`
    UPDATE asignaciones_actividad
    SET activo = false, removido_en = NOW()
    WHERE id = ${id}
  `;
  return c.json({ message: "Asignación de actividad removida" });
});

export default app;
