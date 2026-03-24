import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createHash } from "node:crypto";
import { sql } from "@/db";
import { subirPDF } from "@/lib/cloudinary";
import { authMiddleware, requireRole } from "@/middleware/auth";
import { generarPdfBitacora } from "@/lib/pdf";
import type { PdfConfig } from "@/lib/pdf";
import type { JwtPayload } from "@/lib/jwt";

const app = new Hono<{
  Variables: {
    user: JwtPayload;
  };
}>();
app.use("*", authMiddleware, requireRole("administrador", "coordinador"));

app.get("/", async (c) => {
  const user = c.get("user");
  const { tecnico_id, mes, anio, estado, tipo } = c.req.query();

  const condiciones: string[] = [];
  const params: Array<string | number> = [];
  let i = 1;

  if (user.rol === "coordinador") {
    condiciones.push(`t.coordinador_id = $${i++}`);
    params.push(user.sub);
  }
  if (tecnico_id) { condiciones.push(`b.tecnico_id = $${i++}`); params.push(tecnico_id); }
  if (mes) { condiciones.push(`EXTRACT(MONTH FROM b.fecha_inicio) = $${i++}`); params.push(Number(mes)); }
  if (anio) { condiciones.push(`EXTRACT(YEAR FROM b.fecha_inicio) = $${i++}`); params.push(Number(anio)); }
  if (estado) { condiciones.push(`b.estado = $${i++}`); params.push(estado); }
  if (tipo) { condiciones.push(`b.tipo = $${i++}`); params.push(tipo); }

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

  const bitacoras = await sql.unsafe(
    `SELECT b.id, b.tipo, b.estado, b.fecha_inicio, b.fecha_fin,
            t.nombre AS tecnico_nombre,
            be.nombre AS beneficiario_nombre,
            cp.nombre AS cadena_nombre,
            a.nombre AS actividad_nombre
     FROM bitacoras b
     JOIN tecnicos t ON t.id = b.tecnico_id
     LEFT JOIN beneficiarios be ON be.id = b.beneficiario_id
     LEFT JOIN cadenas_productivas cp ON cp.id = b.cadena_productiva_id
     LEFT JOIN actividades a ON a.id = b.actividad_id
     LEFT JOIN usuarios u ON u.id = t.coordinador_id
     ${where}
     ORDER BY b.fecha_inicio DESC
     LIMIT 100`,
    params
  );
  return c.json(bitacoras);
});

app.get("/:id", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const [bitacora] =
    user.rol === "administrador"
      ? await sql`SELECT * FROM bitacoras WHERE id = ${id}`
      : await sql`
          SELECT b.* FROM bitacoras b
          JOIN tecnicos t ON t.id = b.tecnico_id
          WHERE b.id = ${id} AND t.coordinador_id = ${user.sub}
        `;
  if (!bitacora) return c.json({ error: "Bitácora no encontrada" }, 404);
  return c.json(bitacora);
});

app.patch(
  "/:id",
  zValidator(
    "json",
    z.object({
      observaciones: z.string().optional(),
      actividades_realizadas: z.string().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.param();
    const body = c.req.valid("json");

    const [pertenece] =
      user.rol === "administrador"
        ? await sql`SELECT id FROM bitacoras WHERE id = ${id}`
        : await sql`
            SELECT b.id FROM bitacoras b
            JOIN tecnicos t ON t.id = b.tecnico_id
            WHERE b.id = ${id} AND t.coordinador_id = ${user.sub}
          `;
    if (!pertenece) return c.json({ error: "Bitácora no encontrada" }, 404);

    const [actualizada] = await sql`
      UPDATE bitacoras SET
        observaciones_coordinador = COALESCE(${body.observaciones ?? null}, observaciones_coordinador),
        actividades_desc          = COALESCE(${body.actividades_realizadas ?? null}, actividades_desc),
        updated_at                = NOW()
      WHERE id = ${id}
      RETURNING id, tipo, estado, observaciones_coordinador, actividades_desc, updated_at
    `;
    return c.json(actualizada);
  }
);

async function obtenerBitacoraConAcceso(id: string, userId: string, rol: string) {
  return rol === "administrador"
    ? (await sql`SELECT * FROM bitacoras WHERE id = ${id}`)[0]
    : (
        await sql`
          SELECT b.* FROM bitacoras b
          JOIN tecnicos t ON t.id = b.tecnico_id
          WHERE b.id = ${id} AND t.coordinador_id = ${userId}
        `
      )[0];
}

async function cargarPdfConfig(): Promise<PdfConfig> {
  const [row] = await sql`
    SELECT valor FROM configuraciones WHERE clave = 'pdf_encabezado'
  `;
  return (row?.valor ?? {}) as PdfConfig;
}

app.get("/:id/pdf", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const bitacora = await obtenerBitacoraConAcceso(id, user.sub, user.rol);
  if (!bitacora) return c.json({ error: "Bitácora no encontrada" }, 404);

  const pdfConfig = await cargarPdfConfig();
  const pdfBytes = await generarPdfBitacora(bitacora, {}, pdfConfig);
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="bitacora-${id}.pdf"`,
    },
  });
});

app.get("/:id/pdf/descargar", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const bitacora = await obtenerBitacoraConAcceso(id, user.sub, user.rol);
  if (!bitacora) return c.json({ error: "Bitácora no encontrada" }, 404);

  const pdfConfig = await cargarPdfConfig();
  const pdfBytes = await generarPdfBitacora(bitacora, {}, pdfConfig);
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bitacora-${id}.pdf"`,
    },
  });
});

app.post("/:id/pdf/imprimir", async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const bitacora = await obtenerBitacoraConAcceso(id, user.sub, user.rol);
  if (!bitacora) return c.json({ error: "Bitácora no encontrada" }, 404);

  const pdfConfig = await cargarPdfConfig();
  const pdfBytes = await generarPdfBitacora(bitacora, { impresion: true }, pdfConfig);

  const buffer = Buffer.from(pdfBytes);
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  const [{ next_version }] = await sql`
    SELECT COALESCE(MAX(version), 0) + 1 AS next_version
    FROM pdf_versiones
    WHERE bitacora_id = ${id}
  `;

  const { secure_url } = await subirPDF(
    buffer,
    `campo/pdfs/${bitacora.tecnico_id}/${new Date().getMonth() + 1}`,
    `bitacora-${id}-impresion-${Date.now()}`
  );

  await sql`
    INSERT INTO pdf_versiones (bitacora_id, version, r2_key, sha256, inmutable, generado_por)
    VALUES (${id}, ${next_version}, ${secure_url}, ${sha256}, false, ${user.sub})
  `;

  return new Response(Buffer.from(pdfBytes), {
    headers: { "Content-Type": "application/pdf" },
  });
});

app.get("/:id/versiones", async (c) => {
  const { id } = c.req.param();
  const versiones = await sql`
    SELECT id, version, r2_key, sha256, inmutable, generado_por, created_at
    FROM pdf_versiones
    WHERE bitacora_id = ${id}
    ORDER BY version DESC
  `;
  return c.json(versiones);
});

export default app;
