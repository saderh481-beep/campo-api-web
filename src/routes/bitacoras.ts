import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createHash } from "node:crypto";
import { sql } from "@/db";
import { subirPDF } from "@/lib/campo-files";
import { authMiddleware, requireRole } from "@/middleware/auth";
import { generarPdfBitacora } from "@/lib/pdf";
import type { PdfConfig } from "@/lib/pdf";
import type { JwtPayload } from "@/lib/jwt";
import type { BitacoraFiltros } from "@/domain/entities/bitacora.entity";
import {
  findBitacoraById,
  findBitacoraByIdWithAccess,
  findAllBitacoras,
  updateBitacora,
  updateBitacoraPdfConfig,
  existsBitacoraByIdWithAccess,
  findPdfVersionesByBitacoraId,
  getNextPdfVersion,
  createPdfVersion,
  getPdfConfig,
} from "@/repositories/bitacora.repository";

const app = new Hono<{
  Variables: {
    user: JwtPayload;
  };
}>();
app.use("*", authMiddleware);

app.get(
  "/",
  requireRole("admin", "coordinador"),
  zValidator(
    "query",
    z.object({
      tecnico_id: z.string().uuid().optional(),
      mes: z.coerce.number().int().min(1).max(12).optional(),
      anio: z.coerce.number().int().min(1900).max(3000).optional(),
      estado: z.string().max(40).optional(),
      tipo: z.string().max(80).optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const filtros = c.req.valid("query") as BitacoraFiltros;
    const bitacoras = await findAllBitacoras(filtros, user.sub, user.rol);
    return c.json(bitacoras);
  }
);

app.get(
  "/:id",
  requireRole("admin", "coordinador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const bitacora = await findBitacoraByIdWithAccess(id, user.sub, user.rol);
    if (!bitacora) return c.json({ error: "Bitácora no encontrada" }, 404);
    return c.json(bitacora);
  }
);

app.patch(
  "/:id",
  requireRole("admin", "coordinador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator(
    "json",
    z.object({
      observaciones: z.string().max(5000).optional(),
      actividades_realizadas: z.string().max(10000).optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const tieneAcceso = await existsBitacoraByIdWithAccess(id, user.sub, user.rol);
    if (!tieneAcceso) return c.json({ error: "Bitácora no encontrada" }, 404);

    const actualizada = await updateBitacora(id, {
      observaciones: body.observaciones,
      actividades_realizadas: body.actividades_realizadas,
    });
    return c.json(actualizada);
  }
);

app.patch(
  "/:id/pdf-config",
  requireRole("admin", "coordinador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator("json", z.object({ pdf_edicion: z.record(z.string(), z.unknown()) })),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const { pdf_edicion } = c.req.valid("json");

    const tieneAcceso = await existsBitacoraByIdWithAccess(id, user.sub, user.rol);
    if (!tieneAcceso) return c.json({ error: "Bitácora no encontrada" }, 404);

    const actualizada = await updateBitacoraPdfConfig(id, pdf_edicion);
    return c.json(actualizada);
  }
);

app.get(
  "/:id/pdf",
  zValidator("param", z.object({ id: z.string().uuid() })),
  requireRole("admin", "coordinador", "tecnico"),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const bitacora = await findBitacoraByIdWithAccess(id, user.sub, user.rol);
    if (!bitacora) return c.json({ error: "Bitácora no encontrada" }, 404);

    const pdfConfig = await getPdfConfig();
    const pdfBytes = await generarPdfBitacora(bitacora as unknown as Record<string, unknown>, {}, pdfConfig as PdfConfig);
    return new Response(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="bitacora-${id}.pdf"`,
      },
    });
  }
);

app.get(
  "/:id/pdf/descargar",
  zValidator("param", z.object({ id: z.string().uuid() })),
  requireRole("admin", "coordinador", "tecnico"),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const bitacora = await findBitacoraByIdWithAccess(id, user.sub, user.rol);
    if (!bitacora) return c.json({ error: "Bitácora no encontrada" }, 404);

    const pdfConfig = await getPdfConfig();
    const pdfBytes = await generarPdfBitacora(bitacora as unknown as Record<string, unknown>, {}, pdfConfig as PdfConfig);
    return new Response(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bitacora-${id}.pdf"`,
      },
    });
  }
);

app.post(
  "/:id/pdf/imprimir",
  zValidator("param", z.object({ id: z.string().uuid() })),
  requireRole("admin", "coordinador", "tecnico"),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const bitacora = await findBitacoraByIdWithAccess(id, user.sub, user.rol);
    if (!bitacora) return c.json({ error: "Bitácora no encontrada" }, 404);

    const pdfConfig = await getPdfConfig();
    const pdfBytes = await generarPdfBitacora(bitacora as unknown as Record<string, unknown>, { impresion: true }, pdfConfig as PdfConfig);

    const buffer = Buffer.from(pdfBytes);
    const sha256 = createHash("sha256").update(buffer).digest("hex");

    const nextVersion = await getNextPdfVersion(id);

    const publicId = `bitacoras/${bitacora.tecnico_id}/${new Date().getMonth() + 1}/bitacora-${id}-impresion-${Date.now()}`;
    const upload = await subirPDF(id, buffer, `bitacora-${id}-impresion-${Date.now()}.pdf`);

    await createPdfVersion({
      bitacoraId: id,
      version: nextVersion,
      r2Key: upload.url,
      sha256,
      inmutable: false,
      generadoPor: user.sub,
    });

    return new Response(Buffer.from(pdfBytes), {
      headers: { "Content-Type": "application/pdf" },
    });
  }
);

app.get(
  "/:id/versiones",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.valid("param");
    const user = c.get("user");
    const bitacora = await findBitacoraByIdWithAccess(id, user.sub, user.rol);
    if (!bitacora) return c.json({ error: "Bitácora no encontrada" }, 404);

    const versiones = await findPdfVersionesByBitacoraId(id);
    return c.json(versiones);
  }
);

export default app;
