import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "@/middleware/auth";
import { sql } from "@/config/db";

const router = new Hono();
router.use("*", requireAuth);

const querySchema = z.object({
  leida:    z.coerce.boolean().optional(),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// GET /notificaciones
router.get("/", zValidator("query", querySchema), async (c) => {
  const { leida, page, pageSize } = c.req.valid("query");
  const { sub } = c.get("jwtPayload");
  const offset   = (page - 1) * pageSize;

  const rows = await sql`
    SELECT id, tipo, titulo, cuerpo, leida, creado_en
    FROM notificaciones
    WHERE usuario_id = ${sub}
      ${leida !== undefined ? sql`AND leida = ${leida}` : sql``}
    ORDER BY creado_en DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  const [{ count, noLeidas }] = await sql<[{ count: number; noLeidas: number }]>`
    SELECT
      COUNT(*)::int            AS count,
      COUNT(*) FILTER (WHERE leida = FALSE)::int AS no_leidas
    FROM notificaciones WHERE usuario_id = ${sub}
  `;

  return c.json({ data: rows, total: count, noLeidas, page, pageSize });
});

// PATCH /notificaciones/:id/leer
router.patch("/:id/leer", async (c) => {
  await sql`
    UPDATE notificaciones SET leida = TRUE
    WHERE id = ${c.req.param("id")} AND usuario_id = ${c.get("jwtPayload").sub}
  `;
  return c.json({ ok: true });
});

// PATCH /notificaciones/leer-todas
router.patch("/leer-todas", async (c) => {
  await sql`
    UPDATE notificaciones SET leida = TRUE
    WHERE usuario_id = ${c.get("jwtPayload").sub} AND leida = FALSE
  `;
  return c.json({ ok: true });
});

export default router;
