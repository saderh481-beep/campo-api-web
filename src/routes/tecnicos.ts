import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "@/db";
import { redis } from "@/lib/redis";
import { enviarCodigoTecnico } from "@/lib/mailer";
import { authMiddleware, requireRole } from "@/middleware/auth";

const app = new Hono();

app.use("*", authMiddleware);

app.get("/", requireRole("admin", "coordinador"), async (c) => {
  const user = c.get("user");
  const tecnicos =
    user.rol === "admin"
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

app.get("/:id", requireRole("admin", "coordinador"), async (c) => {
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
  requireRole("admin"),
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
    const body = c.req.valid("json");
    const [nuevo] = await sql`
      INSERT INTO tecnicos (nombre, correo, telefono, coordinador_id, fecha_limite)
      VALUES (${body.nombre}, ${body.correo}, ${body.telefono ?? null}, ${body.coordinador_id}, ${body.fecha_limite})
      RETURNING id, nombre, correo, telefono, fecha_limite, activo, creado_en
    `;
    return c.json(nuevo, 201);
  }
);

app.patch(
  "/:id",
  requireRole("admin"),
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
        actualizado_en = NOW()
      WHERE id = ${id}
      RETURNING id, nombre, correo, telefono, fecha_limite, activo
    `;
    if (!actualizado) return c.json({ error: "Técnico no encontrado" }, 404);
    return c.json(actualizado);
  }
);

app.post("/:id/codigo", requireRole("admin"), async (c) => {
  const { id } = c.req.param();
  const [tecnico] = await sql`
    SELECT id, nombre, correo, fecha_limite FROM tecnicos WHERE id = ${id} AND activo = true
  `;
  if (!tecnico) return c.json({ error: "Técnico no encontrado" }, 404);

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const codigo = Array.from({ length: 5 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");

  const fechaLimite = new Date(tecnico.fecha_limite);
  const ttl = Math.max(1, Math.floor((fechaLimite.getTime() - Date.now()) / 1000));

  await redis.setex(`tech:${codigo}`, ttl, tecnico.id);

  try {
    await enviarCodigoTecnico(tecnico.correo, tecnico.nombre, codigo, fechaLimite);
  } catch (err) {
    console.error("[Código técnico] Error al enviar correo:", err);
  }

  return c.json({ message: "Código generado y enviado", codigo });
});

app.delete("/:id", requireRole("admin"), async (c) => {
  const { id } = c.req.param();
  const [tecnico] = await sql`
    UPDATE tecnicos SET activo = false, actualizado_en = NOW()
    WHERE id = ${id}
    RETURNING id
  `;
  if (!tecnico) return c.json({ error: "Técnico no encontrado" }, 404);

  const keys = await redis.keys("tech:*");
  for (const key of keys) {
    const val = await redis.get(key);
    if (val === id) await redis.del(key);
  }

  return c.json({ message: "Técnico desactivado" });
});

export default app;
