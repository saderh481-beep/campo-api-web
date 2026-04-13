import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { fetch } from "undici";

export interface PdfConfig {
  institucion?: string | null;
  dependencia?: string | null;
  logo_url?: string | null;
  pie_pagina?: string | null;
}

const COLOR_VERDE_INSTITUCIONAL = rgb(0 / 255, 102 / 255, 51 / 255);
const COLOR_BLANCO = rgb(1, 1, 1);
const COLOR_GRIS_OSCURO = rgb(0.2, 0.2, 0.2);
const COLOR_GRIS_CLARO = rgb(0.6, 0.6, 0.6);
const COLOR_GRIS_MUY_CLARO = rgb(0.9, 0.9, 0.9);

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
  const titleSize = 14;
  const sectionSize = 11;
  const margin = 40;
  const contentWidth = width - (margin * 2);

  const logoUrl = config.logo_url as string | undefined;
  let logoHeight = 0;
  let logoWidth = 0;

  if (logoUrl) {
    const logoImg = await embedImage(pdfDoc, logoUrl);
    if (logoImg) {
      const logoDims = calculateFit(logoImg.width, logoImg.height, 120, 40);
      logoWidth = logoDims.width;
      logoHeight = logoDims.height;
      page.drawImage(logoImg, {
        x: margin,
        y: height - margin - logoHeight,
        width: logoWidth,
        height: logoHeight,
      });
    }
  }

  page.drawRectangle({
    x: margin,
    y: height - margin - logoHeight - 8,
    width: contentWidth,
    height: 3,
    color: COLOR_VERDE_INSTITUCIONAL,
  });

  const institution = (config.institucion as string) || "SECRETARÍA DE DESARROLLO AGROPECUARIO";
  const dependencia = config.dependencia as string | null;

  let headerY = height - margin - logoHeight - 20;
  page.drawText(institution.toUpperCase(), {
    x: logoUrl ? margin + logoWidth + 15 : margin,
    y: headerY,
    size: titleSize,
    font: boldFont,
    color: COLOR_VERDE_INSTITUCIONAL,
  });

  headerY -= 16;
  if (dependencia) {
    page.drawText(dependencia.toUpperCase(), {
      x: logoUrl ? margin + logoWidth + 15 : margin,
      y: headerY,
      size: fontSize,
      font: boldFont,
      color: COLOR_GRIS_OSCURO,
    });
    headerY -= 14;
  }

  page.drawText("PRIMERO EL PUEBLO", {
    x: logoUrl ? margin + logoWidth + 15 : margin,
    y: headerY,
    size: fontSize + 2,
    font: boldFont,
    color: COLOR_GRIS_OSCURO,
  });

  let y = height - margin - logoHeight - 60;

  page.drawRectangle({
    x: margin,
    y: y - 5,
    width: contentWidth,
    height: 2,
    color: COLOR_GRIS_MUY_CLARO,
  });

  y -= 25;
  page.drawText("BITÁCORA DE VISITA", {
    x: margin,
    y,
    size: titleSize + 2,
    font: boldFont,
    color: COLOR_VERDE_INSTITUCIONAL,
  });

  const folioOrId = bitacora.folio as string || bitacora.id as string || "";
  if (folioOrId) {
    const folioWidth = boldFont.widthOfTextAtSize(`Folio: ${folioOrId}`, fontSize);
    page.drawText(`Folio: ${folioOrId}`, {
      x: width - margin - folioWidth,
      y,
      size: fontSize,
      font: boldFont,
      color: COLOR_GRIS_OSCURO,
    });
  }

  y -= 35;

  page.drawRectangle({
    x: margin,
    y: y - 5,
    width: contentWidth,
    height: 25,
    color: COLOR_VERDE_INSTITUCIONAL,
  });
  page.drawText("DATOS DE LA VISITA", {
    x: margin + 10,
    y: y,
    size: sectionSize,
    font: boldFont,
    color: COLOR_BLANCO,
  });
  y -= 20;

  const boxWidth = contentWidth / 2 - 5;
  
  page.drawRectangle({
    x: margin,
    y: y - 80,
    width: contentWidth,
    height: 85,
    borderColor: COLOR_GRIS_CLARO,
    borderWidth: 1,
    color: COLOR_BLANCO,
  });

  const fields = [
    { label: "Tipo de Visita:", value: String(bitacora.tipo ?? "-"), col: 0 },
    { label: "Estado:", value: String(bitacora.estado ?? "-"), col: 1 },
    { label: "Fecha de Inicio:", value: String(bitacora.fecha_inicio ?? "-"), col: 0 },
    { label: "Fecha de Fin:", value: String(bitacora.fecha_fin ?? "-"), col: 1 },
  ];

  y -= 15;
  for (const field of fields) {
    const xPos = margin + 10 + (field.col * (boxWidth + 10));
    page.drawText(field.label, {
      x: xPos,
      y,
      size: fontSize,
      font: boldFont,
      color: COLOR_VERDE_INSTITUCIONAL,
    });
    page.drawText(field.value, {
      x: xPos + 90,
      y,
      size: fontSize,
      font,
      color: COLOR_GRIS_OSCURO,
    });
    if (field.col === 0) y -= 18;
  }

  y -= 45;

  page.drawRectangle({
    x: margin,
    y: y - 5,
    width: contentWidth,
    height: 25,
    color: COLOR_VERDE_INSTITUCIONAL,
  });
  page.drawText("DATOS DEL BENEFICIARIO", {
    x: margin + 10,
    y,
    size: sectionSize,
    font: boldFont,
    color: COLOR_BLANCO,
  });
  y -= 20;

  page.drawRectangle({
    x: margin,
    y: y - 85,
    width: contentWidth,
    height: 90,
    borderColor: COLOR_GRIS_CLARO,
    borderWidth: 1,
    color: COLOR_BLANCO,
  });

y -= 15;
  const beneficiarioFields = [
    { label: "Nombre:", value: String(bitacora.beneficiario_nombre ?? "-") },
    { label: "Municipio:", value: String(bitacora.beneficiario_municipio ?? "-") },
    { label: "Localidad:", value: String(bitacora.beneficiario_localidad ?? "-") },
  ];

  for (const field of beneficiarioFields) {
    page.drawText(field.label, {
      x: margin + 10,
      y,
      size: fontSize,
      font: boldFont,
      color: COLOR_VERDE_INSTITUCIONAL,
    });
    page.drawText(field.value, {
      x: margin + 100,
      y,
      size: fontSize,
      font,
      color: COLOR_GRIS_OSCURO,
    });
    y -= 18;
  }

  y -= 25;

  page.drawRectangle({
    x: margin,
    y: y - 5,
    width: contentWidth,
    height: 25,
    color: COLOR_VERDE_INSTITUCIONAL,
  });
  page.drawText("DATOS DEL TÉCNICO", {
    x: margin + 10,
    y,
    size: sectionSize,
    font: boldFont,
    color: COLOR_BLANCO,
  });
  y -= 20;

  page.drawRectangle({
    x: margin,
    y: y - 35,
    width: contentWidth,
    height: 40,
    borderColor: COLOR_GRIS_CLARO,
    borderWidth: 1,
    color: COLOR_BLANCO,
  });

  y -= 15;
  page.drawText("Nombre:", {
    x: margin + 10,
    y,
    size: fontSize,
    font: boldFont,
    color: COLOR_VERDE_INSTITUCIONAL,
  });
  page.drawText(String(bitacora.tecnico_nombre ?? "-"), {
    x: margin + 100,
    y,
    size: fontSize,
    font,
    color: COLOR_GRIS_OSCURO,
  });

  const observacionesCoord = String(bitacora.observaciones_coordinador ?? "");
  const tieneObservaciones = observacionesCoord.trim().length > 0;
  
  if (tieneObservaciones) {
    y -= 45;
    page.drawRectangle({
      x: margin,
      y: y - 5,
      width: contentWidth,
      height: 25,
      color: COLOR_VERDE_INSTITUCIONAL,
    });
    page.drawText("OBSERVACIONES DEL COORDINADOR", {
      x: margin + 10,
      y,
      size: sectionSize,
      font: boldFont,
      color: COLOR_BLANCO,
    });
    y -= 20;

    const obsHeight = Math.max(60, Math.ceil(observacionesCoord.length / 80) * 14 + 20);
    page.drawRectangle({
      x: margin,
      y: y - obsHeight + 5,
      width: contentWidth,
      height: obsHeight,
      borderColor: COLOR_GRIS_CLARO,
      borderWidth: 1,
      color: COLOR_BLANCO,
    });

    y -= 15;
    const obsLines = observacionesCoord.split("\n");
    for (const line of obsLines) {
      page.drawText(line.trim() || " ", {
        x: margin + 10,
        y,
        size: fontSize,
        font,
        color: COLOR_GRIS_OSCURO,
      });
      y -= 14;
    }
  } else {
    y -= 45;
  }

  const acts = String(bitacora.actividades_desc ?? "");
  const actLines = acts.split("\n").filter(line => line.trim());
  const tieneActividades = actLines.length > 0;

  if (tieneActividades) {
    page.drawRectangle({
      x: margin,
      y: y - 5,
      width: contentWidth,
      height: 25,
      color: COLOR_VERDE_INSTITUCIONAL,
    });
    page.drawText("ACTIVIDADES REALIZADAS", {
      x: margin + 10,
      y,
      size: sectionSize,
      font: boldFont,
      color: COLOR_BLANCO,
    });
    y -= 20;

    const actHeight = Math.max(60, Math.ceil(acts.length / 80) * 14 + 20);
    page.drawRectangle({
      x: margin,
      y: y - actHeight + 5,
      width: contentWidth,
      height: actHeight,
      borderColor: COLOR_GRIS_CLARO,
      borderWidth: 1,
      color: COLOR_BLANCO,
    });

    y -= 15;
    for (const line of actLines) {
      page.drawText(line, {
        x: margin + 10,
        y,
        size: fontSize,
        font,
        color: COLOR_GRIS_OSCURO,
      });
      y -= 14;
    }
  }

  const recomendaciones = String(bitacora.recomendaciones ?? "");
  const tieneRecomendaciones = recomendaciones.trim().length > 0;

  if (tieneRecomendaciones) {
    if (y < 200) {
      pdfDoc.addPage();
      y = height - margin;
    }
    y -= 15;
    page.drawRectangle({
      x: margin,
      y: y - 5,
      width: contentWidth,
      height: 25,
      color: COLOR_VERDE_INSTITUCIONAL,
    });
    page.drawText("RECOMENDACIONES / EVALUACIÓN", {
      x: margin + 10,
      y,
      size: sectionSize,
      font: boldFont,
      color: COLOR_BLANCO,
    });
    y -= 20;

    const recHeight = Math.max(60, Math.ceil(recomendaciones.length / 80) * 14 + 20);
    page.drawRectangle({
      x: margin,
      y: y - recHeight + 5,
      width: contentWidth,
      height: recHeight,
      borderColor: COLOR_GRIS_CLARO,
      borderWidth: 1,
      color: COLOR_BLANCO,
    });

    y -= 15;
    const recLines = recomendaciones.split("\n");
    for (const line of recLines) {
      page.drawText(line.trim() || " ", {
        x: margin + 10,
        y,
        size: fontSize,
        font,
        color: COLOR_GRIS_OSCURO,
      });
      y -= 14;
    }
  }

  const comentariosBenef = String(bitacora.comentarios_beneficiario ?? "");
  const tieneComentarios = comentariosBenef.trim().length > 0;

  if (tieneComentarios) {
    if (y < 200) {
      pdfDoc.addPage();
      y = height - margin;
    }
    y -= 15;
    page.drawRectangle({
      x: margin,
      y: y - 5,
      width: contentWidth,
      height: 25,
      color: COLOR_VERDE_INSTITUCIONAL,
    });
    page.drawText("COMENTARIOS DEL BENEFICIARIO", {
      x: margin + 10,
      y,
      size: sectionSize,
      font: boldFont,
      color: COLOR_BLANCO,
    });
    y -= 20;

    const comHeight = Math.max(60, Math.ceil(comentariosBenef.length / 80) * 14 + 20);
    page.drawRectangle({
      x: margin,
      y: y - comHeight + 5,
      width: contentWidth,
      height: comHeight,
      borderColor: COLOR_GRIS_CLARO,
      borderWidth: 1,
      color: COLOR_BLANCO,
    });

    y -= 15;
    const comLines = comentariosBenef.split("\n");
    for (const line of comLines) {
      page.drawText(line.trim() || " ", {
        x: margin + 10,
        y,
        size: fontSize,
        font,
        color: COLOR_GRIS_OSCURO,
      });
      y -= 14;
    }
  }

  const fotoRostroUrl = bitacora.foto_rostro_url as string | undefined;
  const firmaUrl = bitacora.firma_url as string | undefined;
  const fotosCampo = bitacora.fotos_campo as string[] | undefined;
  const tieneFotos = fotoRostroUrl || firmaUrl || (fotosCampo && fotosCampo.length > 0);

  if (tieneFotos) {
    y -= 30;
    page.drawRectangle({
      x: margin,
      y: y - 5,
      width: contentWidth,
      height: 25,
      color: COLOR_VERDE_INSTITUCIONAL,
    });
    page.drawText("EVIDENCIA FOTOGRÁFICA", {
      x: margin + 10,
      y,
      size: sectionSize,
      font: boldFont,
      color: COLOR_BLANCO,
    });
    y -= 30;
  }

  if (fotoRostroUrl) {
    const fotoRostro = await embedImage(pdfDoc, fotoRostroUrl);
    if (fotoRostro) {
      const { width: imgWidth, height: imgHeight } = calculateFit(fotoRostro.width, fotoRostro.height, 100, 80);
      
      page.drawRectangle({
        x: margin,
        y: y - imgHeight - 20,
        width: imgWidth + 10,
        height: imgHeight + 25,
        borderColor: COLOR_GRIS_CLARO,
        borderWidth: 1,
        color: COLOR_BLANCO,
      });
      page.drawImage(fotoRostro, {
        x: margin + 5,
        y: y - imgHeight - 15,
        width: imgWidth,
        height: imgHeight,
      });
      page.drawText("Foto del Beneficiario", {
        x: margin + 5,
        y: y - imgHeight - 30,
        size: fontSize - 1,
        font: boldFont,
        color: COLOR_GRIS_OSCURO,
      });
      y -= imgHeight + 40;
    }
  }

  if (firmaUrl && y > 180) {
    const firma = await embedImage(pdfDoc, firmaUrl);
    if (firma) {
      const { width: imgWidth, height: imgHeight } = calculateFit(firma.width, firma.height, 150, 50);
      if (y < imgHeight + 60) {
        pdfDoc.addPage();
        y = height - margin;
      }
      page.drawRectangle({
        x: margin,
        y: y - imgHeight - 20,
        width: imgWidth + 10,
        height: imgHeight + 25,
        borderColor: COLOR_GRIS_CLARO,
        borderWidth: 1,
        color: COLOR_BLANCO,
      });
      page.drawImage(firma, {
        x: margin + 5,
        y: y - imgHeight - 15,
        width: imgWidth,
        height: imgHeight,
      });
      page.drawText("Firma del Beneficiario", {
        x: margin + 5,
        y: y - imgHeight - 30,
        size: fontSize - 1,
        font: boldFont,
        color: COLOR_GRIS_OSCURO,
      });
      y -= imgHeight + 40;
    }
  }

  if (fotosCampo && fotosCampo.length > 0 && y > 180) {
    y -= 10;
    page.drawText("Fotos de Campo", {
      x: margin,
      y,
      size: sectionSize - 1,
      font: boldFont,
      color: COLOR_VERDE_INSTITUCIONAL,
    });
    y -= 20;

    const imgSize = 65;
    let xImg = margin;
    let count = 0;

    for (const fotoUrl of fotosCampo) {
      if (count >= 4) break;
      const foto = await embedImage(pdfDoc, fotoUrl);
      if (foto) {
        const { width: w, height: h } = calculateFit(foto.width, foto.height, imgSize, imgSize);

        if (xImg + w > width - margin) {
          xImg = margin;
          y -= imgSize + 10;
          if (y < 180) {
            pdfDoc.addPage();
            y = height - margin;
          }
        }

        page.drawRectangle({
          x: xImg - 2,
          y: y - h - 2,
          width: w + 4,
          height: h + 4,
          borderColor: COLOR_GRIS_CLARO,
          borderWidth: 1,
          color: COLOR_BLANCO,
        });
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

  for (let i = 0; i < pdfDoc.getPageCount(); i++) {
    const p = pdfDoc.getPage(i);
    const pHeight = p.getSize().height;
    const footY = 40;

    p.drawRectangle({
      x: margin,
      y: footY - 10,
      width: contentWidth,
      height: 2,
      color: COLOR_VERDE_INSTITUCIONAL,
    });

    p.drawText(`Fecha de generación: ${new Date().toLocaleString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`, {
      x: margin,
      y: footY - 25,
      size: fontSize - 2,
      font,
      color: COLOR_GRIS_CLARO,
    });

    const piePagina = config.pie_pagina as string | null;
    if (piePagina) {
      p.drawText(piePagina, {
        x: margin,
        y: footY - 40,
        size: fontSize - 3,
        font,
        color: COLOR_GRIS_CLARO,
      });
    }
  }

  return pdfDoc.save();
}