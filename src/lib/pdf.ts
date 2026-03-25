import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

type Bitacora = Record<string, unknown>;
type PdfOptions = { impresion?: boolean };
export type PdfConfig = {
  institucion?: string | null;
  dependencia?: string | null;
  logo_url?: string | null;
  pie_pagina?: string | null;
};

export async function generarPdfBitacora(
  bitacora: Bitacora,
  options: PdfOptions = {},
  config: PdfConfig = {}
): Promise<Uint8Array> {
  const edicion =
    bitacora.pdf_edicion && typeof bitacora.pdf_edicion === "object"
      ? (bitacora.pdf_edicion as Record<string, unknown>)
      : {};
  const bitacoraFinal = { ...bitacora, ...edicion };

  const pdfDoc = await PDFDocument.create();
  const margin = options.impresion ? 30 : 50;
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let y = height - margin;

  const institucion =
    config.institucion ?? "SECRETARÍA DE AGRICULTURA Y DESARROLLO RURAL · HIDALGO";

  // Logo (opcional)
  if (config.logo_url) {
    try {
      const res = await fetch(config.logo_url);
      const imgBytes = await res.arrayBuffer();
      const logo = await pdfDoc
        .embedPng(imgBytes)
        .catch(() => pdfDoc.embedJpg(imgBytes));
      page.drawImage(logo, { x: width - margin - 60, y: y - 40, width: 55, height: 55 });
    } catch {
      // logo no disponible
    }
  }

  page.drawText(institucion, {
    x: margin,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });

  if (config.dependencia) {
    y -= 13;
    page.drawText(config.dependencia, {
      x: margin,
      y,
      size: 9,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  y -= 20;
  page.drawText("BITÁCORA DE CAMPO", {
    x: margin,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.3, 0.6),
  });

  y -= 30;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.1, 0.3, 0.6),
  });

  y -= 20;
  const campos: [string, unknown][] = [
    ["ID", bitacoraFinal.id],
    ["Tipo", bitacoraFinal.tipo],
    ["Estado", bitacoraFinal.estado],
    ["Fecha inicio", bitacoraFinal.fecha_inicio],
    ["Fecha fin", bitacoraFinal.fecha_fin ?? "—"],
    ["Observaciones", bitacoraFinal.observaciones_coordinador ?? "—"],
    ["Actividades realizadas", bitacoraFinal.actividades_desc ?? "—"],
  ];

  for (const [label, value] of campos) {
    page.drawText(`${label}:`, { x: margin, y, size: 10, font: fontBold });
    page.drawText(String(value ?? ""), { x: margin + 160, y, size: 10, font: fontRegular });
    y -= 18;
    if (y < margin + 40) break;
  }

  if (bitacoraFinal.foto_rostro_url) {
    try {
      const res = await fetch(String(bitacoraFinal.foto_rostro_url));
      const imgBytes = await res.arrayBuffer();
      const img = await pdfDoc.embedJpg(imgBytes).catch(() => pdfDoc.embedPng(imgBytes));
      page.drawImage(img, { x: width - margin - 100, y: height - margin - 120, width: 90, height: 90 });
    } catch {
      // foto no disponible
    }
  }

  // Pie de página
  if (config.pie_pagina) {
    page.drawLine({
      start: { x: margin, y: margin + 20 },
      end: { x: width - margin, y: margin + 20 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    page.drawText(config.pie_pagina, {
      x: margin,
      y: margin + 6,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  return pdfDoc.save();
}
