import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "@/infrastructure/db";
import { authMiddleware, requireRole } from "@/routes/middlewares/middleware/auth";
import { generarPdfBitacoraHidalgo } from "@/infrastructure/lib/pdf_bitacora_hidalgo";
import type { AppEnv } from "@/types/http";

const BitacoraHidalgoParams = z.object({
  bitacora_id: z.string().uuid(),
});

const BitacoraHidalgoInput = z.object({
  pstyp: z.string().min(2).optional(),
  beneficiario: z.string().min(2).optional(),
  municipio: z.string().optional(),
  calle: z.string().optional(),
  localidad: z.string().optional(),
  cp: z.string().optional(),
  telefono: z.string().optional(),
  telefono_secundario: z.string().optional(),
  beneficiarios_indirectos: z.array(z.string()).optional(),
  lat: z.union([z.string(), z.number()]).optional(),
  long: z.union([z.string(), z.number()]).optional(),
  fecha: z.string().optional(),
  horario: z.string().optional(),
  actividades: z.string().optional(),
  curp: z.string().optional(),
  fecha_firma: z.string().optional(),
  lugar: z.string().optional(),
  vo_bo: z.string().optional(),
});

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("admin", "coordinador", "tecnico"));

async function getBitacoraFotos(bitacoraId: string): Promise<{ foto_rostro_url?: string; firma_url?: string; fotos_campo?: string[] }> {
  try {
    const [row] = await sql`
      SELECT foto_rostro_url, firma_url, fotos_campo 
      FROM bitacoras 
      WHERE id = ${bitacoraId}
    `;
    return row || {};
  } catch {
    return {};
  }
}

async function getArchivoBase64(url: string | null | undefined): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${base64}`;
  } catch {
    return undefined;
  }
}

app.post(
  "/generar/:bitacora_id",
  zValidator("param", BitacoraHidalgoParams),
  zValidator("json", BitacoraHidalgoInput),
  async (c) => {
    try {
      const { bitacora_id } = c.req.param();
      const data = c.req.valid("json");
      
      const fotos = await getBitacoraFotos(bitacora_id);
      
      const fotoBase64 = await getArchivoBase64(fotos.foto_rostro_url);
      const firmaBase64 = await getArchivoBase64(fotos.firma_url);
      
      const fotosCampoBase64: string[] = [];
      if (fotos.fotos_campo && Array.isArray(fotos.fotos_campo)) {
        for (const url of fotos.fotos_campo) {
          const base64 = await getArchivoBase64(url);
          if (base64) fotosCampoBase64.push(base64);
        }
      }
      
      const pdfData = {
        ...data,
        foto_rostro_base64: fotoBase64,
        firma_base64: firmaBase64,
        fotos_campo_base64: fotosCampoBase64,
      };
      
      const pdfBytes = await generarPdfBitacoraHidalgo(pdfData as any);
      const buffer = Buffer.from(pdfBytes);
      
      return c.body(buffer, 200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bitacora-campo-${data.beneficiario || bitacora_id}.pdf"`,
      });
    } catch (e) {
      console.error("[BitacoraHidalgo] Error:", e);
      return c.json({ error: "Error al generar PDF" }, 500);
    }
  }
);

export default app;