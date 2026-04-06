import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface PdfConfig {
  encabezado?: string;
  telefono?: string;
  direccion?: string;
}

export async function generarPdfBitacora(
  bitacora: Record<string, unknown>,
  options: { impresion?: boolean } = {},
  config: PdfConfig = {}
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();

  const fontSize = 10;
  const boldSize = 12;
  const margin = 50;
  let y = height - margin;

  page.drawText("Bitácora de Visita", {
    x: margin,
    y,
    size: boldSize,
    font: boldFont,
  });
  y -= 20;

  const fields = [
    ["Tipo:", String(bitacora.tipo ?? "-")],
    ["Estado:", String(bitacora.estado ?? "-")],
    ["Fecha Inicio:", String(bitacora.fecha_inicio ?? "-")],
    ["Fecha Fin:", String(bitacora.fecha_fin ?? "-")],
    ["Beneficiario:", String(bitacora.beneficiario_nombre ?? "-")],
    ["Técnico:", String(bitacora.tecnico_nombre ?? "-")],
  ];

  for (const [label, value] of fields) {
    page.drawText(`${label} ${value}`, { x: margin, y, size: fontSize, font });
    y -= 15;
  }

  y -= 10;
  page.drawText("Observaciones del Coordinador:", { x: margin, y, size: fontSize, font: boldFont });
  y -= 15;
  const obs = String(bitacora.observaciones_coordinador ?? "Sin observaciones");
  const obsLines = obs.split("\n");
  for (const line of obsLines) {
    page.drawText(line, { x: margin, y, size: fontSize, font });
    y -= 12;
  }

  y -= 20;
  page.drawText("Actividades Realizadas:", { x: margin, y, size: fontSize, font: boldFont });
  y -= 15;
  const acts = String(bitacora.actividades_desc ?? "Sin descripción");
  const actLines = acts.split("\n");
  for (const line of actLines) {
    page.drawText(line, { x: margin, y, size: fontSize, font });
    y -= 12;
  }

  y -= 30;
  page.drawText(`Fecha de generación: ${new Date().toLocaleString()}`, {
    x: margin,
    y,
    size: fontSize - 2,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return pdfDoc.save();
}