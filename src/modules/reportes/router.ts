import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireCoordinador } from "@/middleware/auth";
import { sql } from "@/config/db";

const router = new Hono();
router.use("*", requireAuth, requireCoordinador);

const reporteMensualSchema = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}$/, "Formato YYYY-MM"),
  coordinadorId: z.string().uuid().optional(),
});

// GET /reportes/mensual?mes=2026-03
router.get("/mensual", zValidator("query", reporteMensualSchema), async (c) => {
  const { mes, coordinadorId } = c.req.valid("query");
  const payload  = c.get("jwtPayload");
  const coordId  = payload.rol === "coordinador" ? payload.sub : (coordinadorId ?? null);

  const mesInicio = `${mes}-01`;
  const [year, month] = mes.split("-").map(Number);
  const mesFin = new Date(year, month, 0).toISOString().split("T")[0];

  const rows = await sql`
    SELECT
      t.id                                              AS tecnico_id,
      t.nombre                                          AS tecnico_nombre,
      COUNT(b.id)::int                                  AS total_bitacoras,
      COUNT(b.id) FILTER (WHERE b.tipo = 'A')::int      AS tipo_a,
      COUNT(b.id) FILTER (WHERE b.tipo = 'B')::int      AS tipo_b,
      COUNT(b.id) FILTER (WHERE b.estado = 'cerrada')::int AS cerradas,
      COUNT(b.id) FILTER (WHERE b.estado = 'borrador')::int AS borradores,
      COUNT(DISTINCT b.beneficiario_id)::int            AS beneficiarios_atendidos
    FROM tecnicos t
    LEFT JOIN bitacoras b
      ON b.tecnico_id = t.id
      AND b.fecha_inicio BETWEEN ${mesInicio} AND ${mesFin}
    WHERE t.activo = TRUE
      ${coordId ? sql`AND t.coordinador_id = ${coordId}` : sql``}
    GROUP BY t.id, t.nombre
    ORDER BY t.nombre ASC
  `;

  return c.json({ mes, data: rows });
});

export default router;
