import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { fetch } from "undici";

export interface PdfConfig {
  encabezado?: string;
  telefono?: string;
  direccion?: string;
}

async function loadImageFromUrl(url: string): Promise<Uint8Array | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function embedImage(pdfDoc: PDFDocument, imageUrl: string): Promise<any | null> {
  const imageData = await loadImageFromUrl(imageUrl);
  if (!imageData) return null;
  try {
    if (imageUrl.toLowerCase().includes(".jpg") || imageUrl.toLowerCase().includes(".jpeg")) {
      return await pdfDoc.embedJpg(imageData);
    }
    return await pdfDoc.embedPng(imageData);
  } catch {
    return null;
  }
}

function calculateFit(originalWidth: number, originalHeight: number, maxWidth: number, maxHeight: number): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;
  let newWidth = maxWidth;
  let newHeight = newWidth / aspectRatio;

  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = newHeight * aspectRatio;
  }

  return { width: Math.round(newWidth), height: Math.round(newHeight) };
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

  if (y < 150) {
    pdfDoc.addPage();
    y = height - margin;
  }

  y -= 30;
  page.drawText("Foto del Rostro:", { x: margin, y, size: fontSize, font: boldFont });
  y -= 15;

  const fotoRostroUrl = bitacora.foto_rostro_url as string | undefined;
  if (fotoRostroUrl) {
    const fotoRostro = await embedImage(pdfDoc, fotoRostroUrl);
    if (fotoRostro) {
      const { width: imgWidth, height: imgHeight } = calculateFit(fotoRostro.width, fotoRostro.height, 100, 100);
      page.drawImage(fotoRostro, {
        x: margin,
        y: y - imgHeight,
        width: imgWidth,
        height: imgHeight,
      });
      y -= imgHeight + 15;
    }
  }

  if (y < 150) {
    pdfDoc.addPage();
    y = height - margin;
  }

  page.drawText("Firma:", { x: margin, y, size: fontSize, font: boldFont });
  y -= 15;

  const firmaUrl = bitacora.firma_url as string | undefined;
  if (firmaUrl) {
    const firma = await embedImage(pdfDoc, firmaUrl);
    if (firma) {
      const { width: imgWidth, height: imgHeight } = calculateFit(firma.width, firma.height, 150, 60);
      page.drawImage(firma, {
        x: margin,
        y: y - imgHeight,
        width: imgWidth,
        height: imgHeight,
      });
      y -= imgHeight + 15;
    }
  }

  if (y < 150) {
    pdfDoc.addPage();
    y = height - margin;
  }

  page.drawText("Fotos de Campo:", { x: margin, y, size: fontSize, font: boldFont });
  y -= 15;

  const fotosCampo = bitacora.fotos_campo as string[] | undefined;
  if (fotosCampo && fotosCampo.length > 0) {
    let xImg = margin;
    const imgSize = 80;
    let count = 0;

    for (const fotoUrl of fotosCampo) {
      if (count >= 4) break;
      const foto = await embedImage(pdfDoc, fotoUrl);
      if (foto) {
        const { width: w, height: h } = calculateFit(foto.width, foto.height, imgSize, imgSize);

        if (xImg + w > width - margin) {
          xImg = margin;
          y -= imgSize + 10;
          if (y < 150) {
            pdfDoc.addPage();
            y = height - margin;
          }
        }

        page.drawImage(foto, {
          x: xImg,
          y: y - h,
          width: w,
          height: h,
        });

        xImg += w + 10;
        count++;
      }
    }
  }

  for (let i = pdfDoc.getPageCount() - 1; i >= 0; i--) {
    const p = pdfDoc.getPage(i);
    const pHeight = p.getSize().height;
    const marginP = 50;
    let yP = pHeight - marginP;

    if (i > 0) continue;

    p.drawText(`Fecha de generación: ${new Date().toLocaleString()}`, {
      x: marginP,
      y: yP - 20,
      size: fontSize - 2,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfActividadesUrl = bitacora.pdf_actividades_url as string | undefined;
    if (pdfActividadesUrl) {
      p.drawText(`PDF de Actividades: ${pdfActividadesUrl}`, {
        x: marginP,
        y: yP - 40,
        size: fontSize - 2,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }

  return pdfDoc.save();
}