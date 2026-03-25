import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getArchiveDownload, getArchiveLogs, postArchiveConfirm, postArchiveForce } from "@/controllers/archive.controller";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("administrador"));

app.get("/", getArchiveLogs);

app.get("/:periodo/descargar", getArchiveDownload);

app.post(
  "/:periodo/confirmar",
  zValidator("json", z.object({ confirmar: z.literal(true) })),
  postArchiveConfirm
);

app.post("/:periodo/forzar", postArchiveForce);

export default app;
