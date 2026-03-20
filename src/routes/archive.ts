import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "@/db";
import { authMiddleware, requireRole } from "@/middleware/auth";

const app = new Hono();
app.use("*", authMiddleware, requireRole("admin"));

app.get("/", async (c) => {
  const logs = await sql`
    SELECT id, periodo, url_paquete, confirmado_en, creado_en
    FROM archive_logs
    ORDER BY creado_en DESC
  `;
  return c.json(logs);
});

app.get("/:periodo/descargar", async (c) => {
  const { periodo } = c.req.param();
  const [log] = await sql`SELECT url_paquete FROM archive_logs WHERE periodo = ${periodo}`;
  if (!log?.url_paquete) return c.json({ error: "Paquete no disponible" }, 404);

  const res = await fetch(log.url_paquete);
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
    await sql`UPDATE archive_logs SET confirmado_en = NOW() WHERE periodo = ${periodo}`;
    return c.json({ message: `Archivado ${periodo} confirmado` });
  }
);

app.post(
  "/:periodo/forzar",
  async (c) => {
    const { periodo } = c.req.param();
    await sql`
      INSERT INTO archive_logs (periodo, estado)
      VALUES (${periodo}, 'pendiente')
      ON CONFLICT (periodo) DO UPDATE SET estado = 'pendiente', creado_en = NOW()
    `;
    return c.json({ message: `Archivado de ${periodo} encolado` });
  }
);

export default app;
