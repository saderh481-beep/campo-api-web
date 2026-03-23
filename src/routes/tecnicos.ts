import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { hash } from "bcryptjs";
import { randomInt } from "node:crypto";
import { sql } from "@/db";
import { enviarCodigoTecnico } from "@/lib/mailer";
import { authMiddleware, requireRole } from "@/middleware/auth";

const app = new Hono();

app.use("*", authMiddleware);

app.get("/", requireRole("administrador", "coordinador"), async (c) => {
  const user = c.get("user");
  const tecnicos =
    user.rol === "administrador"
      ? await sql`
          SELECT t.*, u.nombre AS coordinador_nombre
          FROM tecnicos t
          LEFT JOIN usuarios u ON u.id = t.coordinador_id
          WHERE t.activo = true
          ORDER BY t.nombre
        `
      : await sql`
          SELECT t.*, u.nombre AS coordinador_nombre
          FROM tecnicos t
          LEFT JOIN usuarios u ON u.id = t.coordinador_id
          WHERE t.coordinador_id = ${user.sub} AND t.activo = true
          ORDER BY t.nombre
        `;
  return c.json(tecnicos);
});

app.get("/:id", requireRole("administrador", "coordinador"), async (c) => {
  const { id } = c.req.param();
  const user = c.get("user");

  const [tecnico] = await sql`
    SELECT t.*, u.nombre AS coordinador_nombre
    FROM tecnicos t
    LEFT JOIN usuarios u ON u.id = t.coordinador_id
    WHERE t.id = ${id} AND t.activo = true
  `;
  if (!tecnico) return c.json({ error: "Técnico no encontrado" }, 404);
  if (user.rol === "coordinador" && tecnico.coordinador_id !== user.sub) {
    return c.json({ error: "Sin permisos" }, 403);
  }

  const asignaciones = await sql`
    SELECT ab.id, b.nombre AS beneficiario, ab.activo
    FROM asignaciones_beneficiario ab
    JOIN beneficiarios b ON b.id = ab.beneficiario_id
    WHERE ab.tecnico_id = ${id} AND ab.activo = true
  `;

  return c.json({ ...tecnico, asignaciones });
});

app.post(
  "/",
  requireRole("administrador"),
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2),
      correo: z.string().email(),
      telefono: z.string().optional(),
      coordinador_id: z.string().uuid(),
      fecha_limite: z.string().datetime(),
    })
  ),
  async (c) => {
    c.req.valid("json");
    return c.json(
      {
        error:
          "La creación de técnicos se realiza desde /usuarios con rol 'tecnico'.",
      },
      409
    );
  }
);

app.patch(
  "/:id",
  requireRole("administrador"),
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2).optional(),
      correo: z.string().email().optional(),
      telefono: z.string().optional(),
      coordinador_id: z.string().uuid().optional(),
      fecha_limite: z.string().datetime().optional(),
    })
  ),
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");
    const [actualizado] = await sql`
      UPDATE tecnicos SET
        nombre        = COALESCE(${body.nombre ?? null}, nombre),
        correo        = COALESCE(${body.correo ?? null}, correo),
        telefono      = COALESCE(${body.telefono ?? null}, telefono),
        coordinador_id = COALESCE(${body.coordinador_id ?? null}, coordinador_id),
        fecha_limite  = COALESCE(${body.fecha_limite ?? null}, fecha_limite),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, nombre, correo, telefono, fecha_limite, activo, created_at, updated_at
    `;
    if (!actualizado) return c.json({ error: "Técnico no encontrado" }, 404);
    return c.json(actualizado);
  }
);

app.post("/:id/codigo", requireRole("administrador"), async (c) => {
  const { id } = c.req.param();
  const [tecnico] = await sql`
    SELECT id, nombre, correo, fecha_limite FROM tecnicos WHERE id = ${id} AND activo = true
  `;
  if (!tecnico) return c.json({ error: "Técnico no encontrado" }, 404);

  const codigo = randomInt(10000, 100000).toString();
  const hashCodigo = await hash(codigo, 12);

  await sql`
    UPDATE tecnicos SET codigo_acceso = ${codigo}, updated_at = NOW() WHERE id = ${id}
  `;
  await sql`
    UPDATE usuarios
    SET codigo_acceso = ${codigo}, hash_codigo_acceso = ${hashCodigo}, updated_at = NOW()
    WHERE correo = ${tecnico.correo} AND rol = 'tecnico' AND activo = true
  `;

  const fechaLimite = new Date(tecnico.fecha_limite);

  try {
    await enviarCodigoTecnico(tecnico.correo, tecnico.nombre, codigo, fechaLimite);
  } catch (err) {
    console.error("[Código técnico] Error al enviar correo:", err);
  }

  return c.json({ message: "Código generado y enviado", codigo });
});

app.delete("/:id", requireRole("administrador"), async (c) => {
  const { id } = c.req.param();
  const [tecnico] = await sql`
    UPDATE tecnicos SET activo = false, updated_at = NOW(), codigo_acceso = NULL
    WHERE id = ${id}
    RETURNING id, correo
  `;
  if (!tecnico) return c.json({ error: "Técnico no encontrado" }, 404);

  await sql`
    UPDATE usuarios
    SET activo = false, updated_at = NOW()
    WHERE correo = ${tecnico.correo} AND rol = 'tecnico'
  `;

  return c.json({ message: "Técnico desactivado" });
});

export default app;
