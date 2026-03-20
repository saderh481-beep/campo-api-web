import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

type Bitacora = Record<string, unknown>;
type PdfOptions = { impresion?: boolean };

export async function generarPdfBitacora(
  bitacora: Bitacora,
  options: PdfOptions = {}
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const margin = options.impresion ? 30 : 50;
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let y = height - margin;

  page.drawText("SECRETARÍA DE AGRICULTURA Y DESARROLLO RURAL · HIDALGO", {
    x: margin,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });

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
    ["ID", bitacora.id],
    ["Tipo", bitacora.tipo],
    ["Estado", bitacora.estado],
    ["Fecha inicio", bitacora.fecha_inicio],
    ["Fecha fin", bitacora.fecha_fin ?? "—"],
    ["Observaciones", bitacora.observaciones ?? "—"],
    ["Actividades realizadas", bitacora.actividades_realizadas ?? "—"],
  ];

  for (const [label, value] of campos) {
    page.drawText(`${label}:`, { x: margin, y, size: 10, font: fontBold });
    page.drawText(String(value ?? ""), { x: margin + 160, y, size: 10, font: fontRegular });
    y -= 18;
    if (y < margin + 40) break;
  }

  if (bitacora.foto_rostro_url) {
    try {
      const res = await fetch(String(bitacora.foto_rostro_url));
      const imgBytes = await res.arrayBuffer();
      const img = await pdfDoc.embedJpg(imgBytes).catch(() => pdfDoc.embedPng(imgBytes));
      page.drawImage(img, { x: width - margin - 100, y: height - margin - 120, width: 90, height: 90 });
    } catch {
      // foto no disponible
    }
  }

  return pdfDoc.save();
}
