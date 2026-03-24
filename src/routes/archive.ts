import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "@/db";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { JwtPayload } from "@/lib/jwt";

const app = new Hono<{
  Variables: {
    user: JwtPayload;
  };
}>();
app.use("*", authMiddleware, requireRole("administrador"));

app.get("/", async (c) => {
  const logs = await sql`
    SELECT id, periodo, total_bitacoras, total_fotos, bytes_comprimidos,
           r2_key_staging, sha256_paquete, estado, descargado_en,
           confirmado_en, confirmado_por, created_at
    FROM archive_logs
    ORDER BY created_at DESC
  `;
  return c.json(logs);
});

app.get("/:periodo/descargar", async (c) => {
  const { periodo } = c.req.param();
  const [log] = await sql`
    SELECT r2_key_staging
    FROM archive_logs
    WHERE periodo = ${periodo} AND r2_key_staging IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
  `;
  if (!log?.r2_key_staging) return c.json({ error: "Paquete no disponible" }, 404);
  if (!/^https?:\/\//.test(log.r2_key_staging)) {
    return c.json({ error: "No hay URL de descarga disponible" }, 400);
  }

  const res = await fetch(log.r2_key_staging);
  if (!res.ok) return c.json({ error: "Error al obtener el archivo" }, 502);

  return new Response(res.body, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="archivo-${periodo}.tar.gz.enc"`,
    },
  });
});

app.post(
  "/:periodo/confirmar",
  zValidator("json", z.object({ confirmar: z.literal(true) })),
  async (c) => {
    const { periodo } = c.req.param();
    const user = c.get("user");
    const [log] = await sql`
      UPDATE archive_logs
      SET estado = 'confirmado', confirmado_en = NOW(), confirmado_por = ${user.sub}
      WHERE id = (
        SELECT id FROM archive_logs
        WHERE periodo = ${periodo}
        ORDER BY created_at DESC
        LIMIT 1
      )
      RETURNING id
    `;
    if (!log) return c.json({ error: "No se encontró archivado para ese periodo" }, 404);
    return c.json({ message: `Archivado ${periodo} confirmado` });
  }
);

app.post(
  "/:periodo/forzar",
  async (c) => {
    const { periodo } = c.req.param();
    const [existente] = await sql`
      SELECT id FROM archive_logs WHERE periodo = ${periodo} AND estado = 'generando'
    `;
    if (existente) return c.json({ error: "Ya existe un archivado en progreso para ese periodo" }, 409);
    await sql`
      INSERT INTO archive_logs (periodo, estado)
      VALUES (${periodo}, 'generando')
    `;
    return c.json({ message: `Archivado de ${periodo} encolado` });
  }
);

export default app;
