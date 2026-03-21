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

app.get("/mensual", async (c) => {
  const user = c.get("user");
  const { mes, anio } = c.req.query();
  const m = mes ? Number(mes) : new Date().getMonth() + 1;
  const y = anio ? Number(anio) : new Date().getFullYear();

  const rows =
    user.rol === "administrador"
      ? await sql`
          SELECT t.nombre AS tecnico,
                 COUNT(*) FILTER (WHERE b.estado = 'cerrada') AS cerradas,
                 COUNT(*) FILTER (WHERE b.estado = 'borrador') AS borradores,
                 COUNT(*) AS total
          FROM bitacoras b
          JOIN tecnicos t ON t.id = b.tecnico_id
          WHERE EXTRACT(MONTH FROM b.fecha_inicio) = ${m}
            AND EXTRACT(YEAR FROM b.fecha_inicio) = ${y}
          GROUP BY t.nombre
          ORDER BY t.nombre
        `
      : await sql`
          SELECT t.nombre AS tecnico,
                 COUNT(*) FILTER (WHERE b.estado = 'cerrada') AS cerradas,
                 COUNT(*) FILTER (WHERE b.estado = 'borrador') AS borradores,
                 COUNT(*) AS total
          FROM bitacoras b
          JOIN tecnicos t ON t.id = b.tecnico_id
          WHERE t.coordinador_id = ${user.sub}
            AND EXTRACT(MONTH FROM b.fecha_inicio) = ${m}
            AND EXTRACT(YEAR FROM b.fecha_inicio) = ${y}
          GROUP BY t.nombre
          ORDER BY t.nombre
        `;
  return c.json({ mes: m, anio: y, tecnicos: rows });
});

app.get("/tecnico/:id", async (c) => {
  const { id } = c.req.param();
  const { desde, hasta } = c.req.query();

  const bitacoras = await sql`
    SELECT b.id, b.tipo, b.estado, b.fecha_inicio, b.fecha_fin,
           be.nombre AS beneficiario, cp.nombre AS cadena, a.nombre AS actividad
    FROM bitacoras b
    LEFT JOIN beneficiarios be ON be.id = b.beneficiario_id
    LEFT JOIN cadenas_productivas cp ON cp.id = b.cadena_productiva_id
    LEFT JOIN actividades a ON a.id = b.actividad_id
    WHERE b.tecnico_id = ${id}
      AND (${desde ?? null}::date IS NULL OR b.fecha_inicio >= ${desde ?? null}::date)
      AND (${hasta ?? null}::date IS NULL OR b.fecha_inicio <= ${hasta ?? null}::date)
    ORDER BY b.fecha_inicio DESC
  `;
  return c.json({ tecnico_id: id, total: bitacoras.length, bitacoras });
});

export default app;
