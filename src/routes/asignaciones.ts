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
app.use("*", authMiddleware, requireRole("administrador"));

app.post(
  "/beneficiario",
  zValidator(
    "json",
    z.object({ tecnico_id: z.string().uuid(), beneficiario_id: z.string().uuid() })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const user = c.get("user");
    const [existente] = await sql`
      SELECT id
      FROM asignaciones_beneficiario
      WHERE tecnico_id = ${body.tecnico_id} AND beneficiario_id = ${body.beneficiario_id}
      ORDER BY asignado_en DESC
      LIMIT 1
    `;

    const [nueva] = existente
      ? await sql`
          UPDATE asignaciones_beneficiario
          SET activo = true, removido_en = NULL
          WHERE id = ${existente.id}
          RETURNING id, tecnico_id, beneficiario_id, activo, asignado_por, asignado_en, removido_en
        `
      : await sql`
          INSERT INTO asignaciones_beneficiario (tecnico_id, beneficiario_id, asignado_por)
          VALUES (${body.tecnico_id}, ${body.beneficiario_id}, ${user.sub})
          RETURNING id, tecnico_id, beneficiario_id, activo, asignado_por, asignado_en, removido_en
        `;

    return c.json(nueva, 201);
  }
);

app.delete("/beneficiario/:id", async (c) => {
  const { id } = c.req.param();
  const [actualizada] = await sql`
    UPDATE asignaciones_beneficiario
    SET activo = false, removido_en = NOW()
    WHERE id = ${id}
    RETURNING id
  `;
  if (!actualizada) return c.json({ error: "Asignación no encontrada" }, 404);
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
    const [existente] = await sql`
      SELECT id
      FROM asignaciones_actividad
      WHERE tecnico_id = ${body.tecnico_id} AND actividad_id = ${body.actividad_id}
      ORDER BY asignado_en DESC
      LIMIT 1
    `;

    const [nueva] = existente
      ? await sql`
          UPDATE asignaciones_actividad
          SET activo = true, removido_en = NULL
          WHERE id = ${existente.id}
          RETURNING id, tecnico_id, actividad_id, activo, asignado_por, asignado_en, removido_en
        `
      : await sql`
          INSERT INTO asignaciones_actividad (tecnico_id, actividad_id, asignado_por)
          VALUES (${body.tecnico_id}, ${body.actividad_id}, ${user.sub})
          RETURNING id, tecnico_id, actividad_id, activo, asignado_por, asignado_en, removido_en
        `;

    return c.json(nueva, 201);
  }
);

app.delete("/actividad/:id", async (c) => {
  const { id } = c.req.param();
  const [actualizada] = await sql`
    UPDATE asignaciones_actividad
    SET activo = false, removido_en = NOW()
    WHERE id = ${id}
    RETURNING id
  `;
  if (!actualizada) return c.json({ error: "Asignación de actividad no encontrada" }, 404);
  return c.json({ message: "Asignación de actividad removida" });
});

export default app;
