import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getArchiveDownload, getArchiveLogs, postArchiveConfirm, postArchiveForce } from "@/controllers/archive.controller";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("administrador"));

app.get("/", getArchiveLogs);

app.get(
  "/:periodo/descargar",
  zValidator("param", z.object({ periodo: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) })),
  getArchiveDownload
);

app.post(
  "/:periodo/confirmar",
  zValidator("param", z.object({ periodo: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) })),
  zValidator("json", z.object({ confirmar: z.literal(true) })),
  postArchiveConfirm
);

app.post(
  "/:periodo/forzar",
  zValidator("param", z.object({ periodo: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) })),
  postArchiveForce
);

export default app;
