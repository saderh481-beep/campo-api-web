import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireCoordinador } from "@/middleware/auth";
import { NotFoundError, AppError } from "@/lib/errors";
import * as repo from "./repository";
import { listarBitacorasSchema, actualizarBitacoraSchema } from "./schema";

const router = new Hono();
router.use("*", requireAuth, requireCoordinador);

// GET /bitacoras
router.get("/", zValidator("query", listarBitacorasSchema), async (c) => {
  return c.json(await repo.findAll(c.req.valid("query")));
});

// GET /bitacoras/:id
router.get("/:id", async (c) => {
  const bitacora = await repo.findById(c.req.param("id"));
  if (!bitacora) throw new NotFoundError("Bitácora");
  return c.json({ bitacora });
});

// PATCH /bitacoras/:id — solo notas, solo si está en borrador
router.patch("/:id", zValidator("json", actualizarBitacoraSchema), async (c) => {
  const bitacora = await repo.update(c.req.param("id"), c.req.valid("json"));
  if (!bitacora) throw new AppError("Bitácora no encontrada o ya cerrada", 400);
  return c.json({ bitacora });
});

// GET /bitacoras/:id/pdf — stream del PDF más reciente
router.get("/:id/pdf", async (c) => {
  const [pdf] = await (await import("@/config/db")).sql`
    SELECT url, version FROM pdf_versiones
    WHERE bitacora_id = ${c.req.param("id")}
    ORDER BY version DESC LIMIT 1
  `;
  if (!pdf) throw new NotFoundError("PDF");
  return c.redirect(pdf.url, 302);
});

// GET /bitacoras/:id/pdf/descargar — descarga forzada
router.get("/:id/pdf/descargar", async (c) => {
  const [pdf] = await (await import("@/config/db")).sql`
    SELECT url, version FROM pdf_versiones
    WHERE bitacora_id = ${c.req.param("id")}
    ORDER BY version DESC LIMIT 1
  `;
  if (!pdf) throw new NotFoundError("PDF");
  // Redirigir con header de descarga (el cliente lo maneja)
  return c.redirect(`${pdf.url}?download=1`, 302);
});

export default router;
