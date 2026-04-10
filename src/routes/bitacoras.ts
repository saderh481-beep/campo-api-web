import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createHash } from "node:crypto";
import { sql } from "@/db";
import { subirPDF, subirFotoRostro, subirFirma, eliminarArchivo } from "@/lib/campo-files";
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
  updateBitacoraFotoRostro,
  updateBitacoraFirma,
  updateBitacoraFotosCampo,
  updateBitacoraPdfActividades,
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

app.post(
  "/:id/foto-rostro",
  requireRole("admin", "coordinador", "tecnico"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");

    const bitacora = await findBitacoraByIdWithAccess(id, user.sub, user.rol);
    if (!bitacora) return c.json({ error: "Bitácora no encontrada" }, 404);

    const formData = await c.req.formData();
    const archivo = formData.get("archivo") as File | null;
    if (!archivo) return c.json({ error: "Archivo requerido" }, 400);

    const buffer = Buffer.from(await archivo.arrayBuffer());
    const result = await subirFotoRostro(id, buffer, archivo.name);

    await updateBitacoraFotoRostro(id, result.url);
    return c.json({ url: result.url, thumbnail: result.thumbnail });
  }
);

app.get(
  "/:id/foto-rostro",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");

    const bitacora = await findBitacoraByIdWithAccess(id, user.sub, user.rol);
    if (!bitacora) return c.json({ error: "Bitácora no encontrada" }, 404);

    return c.json({ url: bitacora.foto_rostro_url });
  }
);

app.post(
  "/:id/firma",
  requireRole("admin", "coordinador", "tecnico"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");

    const bitacora = await findBitacoraByIdWithAccess(id, user.sub, user.rol);
    if (!bitacora) return c.json({ error: "Bitácora no encontrada" }, 404);

    const formData = await c.req.formData();
    const archivo = formData.get("archivo") as File | null;
    if (!archivo) return c.json({ error: "Archivo requerido" }, 400);

    const buffer = Buffer.from(await archivo.arrayBuffer());
    const result = await subirFirma(id, buffer, archivo.name);

    await updateBitacoraFirma(id, result.url);
    return c.json({ url: result.url });
  }
);

app.get(
  "/:id/firma",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");

    const bitacora = await findBitacoraByIdWithAccess(id, user.sub, user.rol);
    if (!bitacora) return c.json({ error: "Bitácora no encontrada" }, 404);

    return c.json({ url: bitacora.firma_url });
  }
);

app.post(
  "/:id/fotos-campo",
  requireRole("admin", "coordinador", "tecnico"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");

    const bitacora = await findBitacoraByIdWithAccess(id, user.sub, user.rol);
    if (!bitacora) return c.json({ error: "Bitácora no encontrada" }, 404);

    const formData = await c.req.formData();
    const archivos = formData.getAll("archivos") as File[];
    if (archivos.length === 0) return c.json({ error: "Archivos requeridos" }, 400);

    const fotosCampo = (bitacora.fotos_campo as unknown as string[]) || [];
    const urls: string[] = [];

    for (const archivo of archivos) {
      const buffer = Buffer.from(await archivo.arrayBuffer());
      const result = await subirPDF(id, buffer, archivo.name);
      fotosCampo.push(result.url);
      urls.push(result.url);
    }

    await updateBitacoraFotosCampo(id, fotosCampo);
    return c.json({ urls });
  }
);

app.get(
  "/:id/fotos-campo",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");

    const bitacora = await findBitacoraByIdWithAccess(id, user.sub, user.rol);
    if (!bitacora) return c.json({ error: "Bitácora no encontrada" }, 404);

    return c.json({ fotos: bitacora.fotos_campo });
  }
);

app.delete(
  "/:id/fotos-campo/:idx",
  requireRole("admin", "coordinador", "tecnico"),
  zValidator("param", z.object({ id: z.string().uuid(), idx: z.coerce.number().int().min(0) })),
  async (c) => {
    const user = c.get("user");
    const { id, idx } = c.req.valid("param");

    const bitacora = await findBitacoraByIdWithAccess(id, user.sub, user.rol);
    if (!bitacora) return c.json({ error: "Bitácora no encontrada" }, 404);

    const fotosCampo = (bitacora.fotos_campo as unknown as string[]) || [];
    if (idx >= fotosCampo.length) return c.json({ error: "Índice no válido" }, 400);

    const urlEliminada = fotosCampo[idx];
    fotosCampo.splice(idx, 1);

    await updateBitacoraFotosCampo(id, fotosCampo);
    return c.json({ message: "Foto eliminada", url: urlEliminada });
  }
);

app.post(
  "/:id/pdf-actividades",
  requireRole("admin", "coordinador", "tecnico"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");

    const bitacora = await findBitacoraByIdWithAccess(id, user.sub, user.rol);
    if (!bitacora) return c.json({ error: "Bitácora no encontrada" }, 404);

    const formData = await c.req.formData();
    const archivo = formData.get("archivo") as File | null;
    if (!archivo) return c.json({ error: "Archivo PDF requerido" }, 400);

    const buffer = Buffer.from(await archivo.arrayBuffer());
    const filename = `bitacora-${id}-actividades-${Date.now()}.pdf`;
    const result = await subirPDF(id, buffer, filename);

    await updateBitacoraPdfActividades(id, result.url);
    return c.json({ url: result.url });
  }
);

app.get(
  "/:id/pdf-actividades",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");

    const bitacora = await findBitacoraByIdWithAccess(id, user.sub, user.rol);
    if (!bitacora) return c.json({ error: "Bitácora no encontrada" }, 404);

    return c.json({ url: bitacora.pdf_actividades_url });
  }
);

app.delete(
  "/:id/pdf-actividades",
  requireRole("admin", "coordinador", "tecnico"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");

    const bitacora = await findBitacoraByIdWithAccess(id, user.sub, user.rol);
    if (!bitacora) return c.json({ error: "Bitácora no encontrada" }, 404);

    await updateBitacoraPdfActividades(id, "");
    return c.json({ message: "PDF de actividades eliminado" });
  }
);

export default app;
