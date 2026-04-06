import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "@/middleware/auth";
import { confirmArchiveLog, findArchiveDownloadUrlByPeriodo, findGeneratingArchive, listArchiveLogs } from "@/models/archive.model";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("admin"));

app.get("/", async (c) => {
  const rows = await listArchiveLogs();
  return c.json(rows);
});

app.get(
  "/:periodo/descargar",
  zValidator("param", z.object({ periodo: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) })),
  async (c) => {
    const { periodo } = c.req.param();
    const log = await findArchiveDownloadUrlByPeriodo(periodo);
    if (!log) return c.json({ error: "Paquete no encontrado" }, 404);
    return c.json({ url: log.r2_key_staging });
  }
);

app.post(
  "/:periodo/confirmar",
  zValidator("param", z.object({ periodo: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) })),
  zValidator("json", z.object({ confirmar: z.literal(true) })),
  async (c) => {
    const { periodo } = c.req.param();
    const user = c.get("user");
    const log = await confirmArchiveLog(periodo, user.sub);
    if (!log) return c.json({ error: "No hay registro para confirmar" }, 404);
    return c.json({ message: "Archivo confirmado" });
  }
);

app.post(
  "/:periodo/forzar",
  zValidator("param", z.object({ periodo: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) })),
  async (c) => {
    const { periodo } = c.req.param();
    const existing = await findGeneratingArchive(periodo);
    if (existing) return c.json({ error: "Ya hay un proceso en curso" }, 409);
    return c.json({ message: "Encolado para generación" });
  }
);

export default app;