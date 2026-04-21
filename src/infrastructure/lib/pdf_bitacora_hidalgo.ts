import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import { fetch } from "undici";

export interface BitacoraHidalgoData {
  pstyp?: string;
  beneficiario?: string;
  municipio?: string;
  calle?: string;
  localidad?: string;
  cp?: string;
  telefono?: string;
  telefono_secundario?: string;
  beneficiarios_indirectos?: string[];
  lat?: string | number;
  long?: string | number;
  fecha?: string;
  horario?: string;
  actividades?: string;
  foto_rostro_url?: string;
  firma_url?: string;
  curp?: string;
  fecha_firma?: string;
  lugar?: string;
  vo_bo?: string;
  foto_rostro_base64?: string;
  firma_base64?: string;
  fotos_campo_base64?: string[];
}

const COLOR_NEGRO = rgb(0, 0, 0);
const COLOR_GRIS_OSCURO = rgb(0.2, 0.2, 0.2);
const COLOR_GRIS_MEDIO = rgb(0.4, 0.4, 0.4);
const COLOR_GRIS_CLARO = rgb(0.7, 0.7, 0.7);
const COLOR_FONDO_GRIS = rgb(0.91, 0.91, 0.91);
const COLOR_BLANCO = rgb(1, 1, 1);

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGEN_SUPERIOR = 56.69;
const MARGEN_INFERIOR = 56.69;
const MARGEN_LATERAL = 70.87;

async function embedImageFromBase64(pdfDoc: PDFDocument, base64: string | undefined): Promise<{ image: any; width: number; height: number } | null> {
  if (!base64) return null;
  try {
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
    const imageData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    if (base64.startsWith("data:image/jpeg") || base64.startsWith("data:image/jpg")) {
      return { image: await pdfDoc.embedJpg(imageData), width: imageData.length, height: 0 };
    }
    return { image: await pdfDoc.embedPng(imageData), width: imageData.length, height: 0 };
  } catch (e) {
    console.error("[PDF] Error embedding image:", e);
    return null;
  }
}

function drawWrappedText(
  page: any,
  font: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  lineHeight: number,
  color: any = COLOR_NEGRO
): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line + word + " ";
    if (font.widthOfTextAtSize(testLine) > maxWidth) {
      page.drawText(line.trim(), { x, y: currentY, size: fontSize, font, color });
      currentY -= lineHeight;
      line = word + " ";
    } else {
      line = testLine;
    }
  }
  page.drawText(line.trim(), { x, y: currentY, size: fontSize, font, color });
  return currentY - lineHeight;
}

export async function generarPdfBitacoraHidalgo(data: BitacoraHidalgoData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const contentWidth = PAGE_WIDTH - (MARGEN_LATERAL * 2);
  let y = PAGE_HEIGHT - MARGEN_SUPERIOR;

  const drawLine = (x1: number, y1: number, x2: number, y2: number, width = 0.5) => {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: width, color: COLOR_GRIS_OSCURO });
  };

  const drawBox = (x: number, y: number, w: number, h: number, borderWidth = 0.5) => {
    page.drawRectangle({ x, y: y - h, width: w, height: h, borderColor: COLOR_GRIS_OSCURO, borderWidth, color: COLOR_BLANCO });
  };

  page.drawRectangle({
    x: 0, y: PAGE_HEIGHT - 100, width: PAGE_WIDTH, height: 100,
    color: COLOR_BLANCO
  });

  page.drawText("HIDALGO", { x: MARGEN_LATERAL, y: y - 20, size: 14, font: boldFont, color: COLOR_NEGRO });
  page.drawText("PRIMERO EL PUEBLO", { x: MARGEN_LATERAL, y: y - 35, size: 8, font, color: COLOR_GRIS_MEDIO });

  page.drawLine({
    start: { x: PAGE_WIDTH / 2 - 50, y: y + 10 },
    end: { x: PAGE_WIDTH / 2 - 50, y: y - 40 },
    thickness: 0.5, color: COLOR_GRIS_OSCURO
  });

  page.drawText("CAMPO", { x: PAGE_WIDTH - MARGEN_LATERAL - 50, y: y - 20, size: 14, font: boldFont, color: COLOR_NEGRO });
  page.drawText("SECRETARÍA DE AGRICULTURA", { x: PAGE_WIDTH - MARGEN_LATERAL - 140, y: y - 35, size: 8, font, color: COLOR_GRIS_MEDIO });
  page.drawText("Y DESARROLLO RURAL", { x: PAGE_WIDTH - MARGEN_LATERAL - 110, y: y - 47, size: 8, font, color: COLOR_GRIS_MEDIO });

  y -= 65;
  page.drawText("BITÁCORA DE CAMPO", { x: PAGE_WIDTH / 2 - 60, y, size: 12, font: boldFont, color: COLOR_NEGRO });

  y -= 25;

  page.drawRectangle({ x: MARGEN_LATERAL, y: y - 5, width: contentWidth, height: 20, color: COLOR_FONDO_GRIS });
  page.drawText("Datos Generales", { x: MARGEN_LATERAL + 10, y: y, size: 10, font: boldFont, color: COLOR_NEGRO });

  y -= 30;

  const leftColWidth = contentWidth * 0.58;

  page.drawText("PSTyP:", { x: MARGEN_LATERAL, y, size: 9, font, color: COLOR_NEGRO });
  drawLine(MARGEN_LATERAL + 35, y - 2, MARGEN_LATERAL + leftColWidth - 20, y - 2);
  if (data.pstyp) {
    page.drawText(data.pstyp.substring(0, 50), { x: MARGEN_LATERAL + 40, y: y - 2, size: 9, font, color: COLOR_NEGRO });
  }

  y -= 18;
  page.drawText("Beneficiario directo:", { x: MARGEN_LATERAL, y, size: 9, font, color: COLOR_NEGRO });
  drawLine(MARGEN_LATERAL + 90, y - 2, MARGEN_LATERAL + leftColWidth - 20, y - 2);
  if (data.beneficiario) {
    page.drawText(data.beneficiario.substring(0, 40), { x: MARGEN_LATERAL + 95, y: y - 2, size: 9, font, color: COLOR_NEGRO });
  }

  y -= 18;
  page.drawText("Dirección:", { x: MARGEN_LATERAL, y, size: 9, font, color: COLOR_NEGRO });

  y -= 14;
  drawLine(MARGEN_LATERAL + 55, y - 2, MARGEN_LATERAL + leftColWidth - 20, y - 2);
  if (data.calle) {
    page.drawText(data.calle.substring(0, 45), { x: MARGEN_LATERAL + 60, y: y - 2, size: 9, font, color: COLOR_NEGRO });
  }

  y -= 14;
  drawLine(MARGEN_LATERAL + 55, y - 2, MARGEN_LATERAL + leftColWidth - 20, y - 2);
  if (data.localidad) {
    page.drawText(data.localidad.substring(0, 45), { x: MARGEN_LATERAL + 60, y: y - 2, size: 9, font, color: COLOR_NEGRO });
  }

  y -= 14;
  drawLine(MARGEN_LATERAL + 55, y - 2, MARGEN_LATERAL + leftColWidth - 20, y - 2);
  if (data.cp) {
    const direccionCompleta = `${data.localidad || ""}, C.P. ${data.cp}`;
    page.drawText(direccionCompleta.substring(0, 45), { x: MARGEN_LATERAL + 60, y: y - 2, size: 9, font, color: COLOR_NEGRO });
  }

  y -= 22;
  page.drawText("Teléfono principal:", { x: MARGEN_LATERAL, y, size: 9, font, color: COLOR_NEGRO });
  drawLine(MARGEN_LATERAL + 85, y - 2, MARGEN_LATERAL + leftColWidth - 20, y - 2);
  if (data.telefono) {
    page.drawText(data.telefono, { x: MARGEN_LATERAL + 90, y: y - 2, size: 9, font, color: COLOR_NEGRO });
  }

  y -= 18;
  page.drawText("Beneficiarios indirectos:", { x: MARGEN_LATERAL, y, size: 9, font, color: COLOR_NEGRO });

  y -= 14;
  drawLine(MARGEN_LATERAL + 105, y - 2, MARGEN_LATERAL + leftColWidth - 20, y - 2);
  if (data.beneficiarios_indirectos && data.beneficiarios_indirectos[0]) {
    page.drawText(data.beneficiarios_indirectos[0].substring(0, 40), { x: MARGEN_LATERAL + 110, y: y - 2, size: 9, font, color: COLOR_NEGRO });
  }

  y -= 14;
  drawLine(MARGEN_LATERAL + 105, y - 2, MARGEN_LATERAL + leftColWidth - 20, y - 2);
  if (data.beneficiarios_indirectos && data.beneficiarios_indirectos[1]) {
    page.drawText(data.beneficiarios_indirectos[1].substring(0, 40), { x: MARGEN_LATERAL + 110, y: y - 2, size: 9, font, color: COLOR_NEGRO });
  }

  const col2X = MARGEN_LATERAL + leftColWidth + 15;
  const col2Width = contentWidth - leftColWidth - 15;

  page.drawText("Municipio:", { x: col2X, y: y + 66, size: 9, font, color: COLOR_NEGRO });
  drawLine(col2X + 55, y + 64, col2X + col2Width, y + 64);
  if (data.municipio) {
    page.drawText(data.municipio, { x: col2X + 60, y: y + 64, size: 9, font, color: COLOR_NEGRO });
  }

  page.drawText("Coordenadas geográficas:", { x: col2X, y: y + 48, size: 9, font, color: COLOR_NEGRO });

  page.drawText("Lat:", { x: col2X, y: y + 34, size: 8, font, color: COLOR_NEGRO });
  drawLine(col2X + 20, y + 32, col2X + 70, y + 32);
  if (data.lat) {
    page.drawText(String(data.lat), { x: col2X + 25, y: y + 32, size: 8, font, color: COLOR_NEGRO });
  }

  page.drawText("Long:", { x: col2X + 75, y: y + 34, size: 8, font, color: COLOR_NEGRO });
  drawLine(col2X + 95, y + 32, col2X + 145, y + 32);
  if (data.long) {
    page.drawText(String(data.long), { x: col2X + 100, y: y + 32, size: 8, font, color: COLOR_NEGRO });
  }

  page.drawText("Teléfono secundario:", { x: col2X, y: y + 18, size: 9, font, color: COLOR_NEGRO });
  drawLine(col2X + 90, y + 16, col2X + col2Width, y + 16);
  if (data.telefono_secundario) {
    page.drawText(data.telefono_secundario, { x: col2X + 95, y: y + 16, size: 9, font, color: COLOR_NEGRO });
  }

  page.drawEllipse({
    x: col2X + col2Width / 2, y: y - 30,
    xScale: 42, yScale: 42,
    borderColor: COLOR_GRIS_OSCURO, borderWidth: 1, color: COLOR_BLANCO
  });
  page.drawText("SELLO", { x: col2X + col2Width / 2 - 18, y: y - 35, size: 6, font: boldFont, color: COLOR_GRIS_MEDIO });
  page.drawText("INSTITUCIONAL", { x: col2X + col2Width / 2 - 30, y: y - 45, size: 6, font: boldFont, color: COLOR_GRIS_MEDIO });

  y -= 70;
  page.drawText("Fecha:", { x: MARGEN_LATERAL, y, size: 9, font, color: COLOR_NEGRO });
  drawLine(MARGEN_LATERAL + 35, y - 2, MARGEN_LATERAL + 120, y - 2);
  if (data.fecha) {
    page.drawText(data.fecha, { x: MARGEN_LATERAL + 40, y: y - 2, size: 9, font, color: COLOR_NEGRO });
  } else {
    const today = new Date();
    page.drawText(`${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getFullYear()}`, { x: MARGEN_LATERAL + 40, y: y - 2, size: 9, font, color: COLOR_NEGRO });
  }

  page.drawText("Horario de atención:", { x: PAGE_WIDTH - MARGEN_LATERAL - 120, y, size: 9, font, color: COLOR_NEGRO });
  drawLine(PAGE_WIDTH - MARGEN_LATERAL - 35, y - 2, PAGE_WIDTH - MARGEN_LATERAL, y - 2);
  if (data.horario) {
    page.drawText(data.horario, { x: PAGE_WIDTH - MARGEN_LATERAL - 110, y: y - 2, size: 9, font, color: COLOR_NEGRO });
  }

  y -= 30;

  page.drawRectangle({ x: MARGEN_LATERAL, y: y - 5, width: contentWidth, height: 20, color: COLOR_FONDO_GRIS });
  page.drawText("Actividades Realizadas (Introducción, Desarrollo y Conclusiones)", { x: MARGEN_LATERAL + 10, y, size: 10, font: boldFont, color: COLOR_NEGRO });

  y -= 15;
  const actividadHeight = 5.5 * 28.35;
  drawBox(MARGEN_LATERAL, y - actividadHeight, contentWidth, actividadHeight);

  if (data.actividades) {
    drawWrappedText(page, font, data.actividades, MARGEN_LATERAL + 10, y - 15, contentWidth - 20, 9, 13);
  }

  y -= actividadHeight + 20;

  // ================== FOTOS DE CAMPO (evidencias de campo) ==================
  const fotosCampo = data.fotos_campo_base64 || [];
  const tieneFotosCampo = fotosCampo.length > 0;
  
  if (tieneFotosCampo) {
    if (y < 300) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGEN_SUPERIOR;
    }
    
    page.drawRectangle({ x: MARGEN_LATERAL, y: y - 5, width: contentWidth, height: 20, color: COLOR_FONDO_GRIS });
    page.drawText("Fotos de Campo", { x: MARGEN_LATERAL + 10, y, size: 10, font: boldFont, color: COLOR_NEGRO });
    
    y -= 30;
    
    const imgWidth = 5.5 * 28.35;
    const imgHeight = 4.5 * 28.35;
    let xImg = MARGEN_LATERAL;
    
    for (let i = 0; i < fotosCampo.length; i++) {
      const embedded = await embedImageFromBase64(pdfDoc, fotosCampo[i]);
      if (embedded && embedded.image) {
        const img = embedded.image;
        const aspectRatio = img.width / img.height;
        let newWidth = imgWidth;
        let newHeight = newWidth / aspectRatio;
        if (newHeight > imgHeight) {
          newHeight = imgHeight;
          newWidth = newHeight * aspectRatio;
        }
        
        if (xImg + newWidth > PAGE_WIDTH - MARGEN_LATERAL - 10) {
          xImg = MARGEN_LATERAL;
          y -= imgHeight + 20;
        }
        
        page.drawRectangle({
          x: xImg - 2, y: y - newHeight - 2,
          width: newWidth + 4, height: newHeight + 4,
          borderColor: COLOR_GRIS_MEDIO, borderWidth: 1, color: COLOR_BLANCO
        });
        page.drawImage(img, { x: xImg, y: y - newHeight, width: newWidth, height: newHeight });
        
        xImg += newWidth + 15;
        if ((i + 1) % 2 === 0) {
          xImg = MARGEN_LATERAL;
          y -= imgHeight + 20;
        }
      }
    }
    
    y -= imgHeight + 40;
  }

  // ================== EVIDENCIAS FOTOGRÁFICAS (Foto Rostro + Firma del Beneficiario) ==================
  if (y < 250) {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGEN_SUPERIOR;
  }
  
  page.drawRectangle({ x: MARGEN_LATERAL, y: y - 5, width: contentWidth, height: 20, color: COLOR_FONDO_GRIS });
  page.drawText("Evidencias Fotográficas", { x: MARGEN_LATERAL + 10, y, size: 10, font: boldFont, color: COLOR_NEGRO });

  y -= 30;

  let colWidth: number, boxWidth: number, boxHeight: number, box1X: number, box2X: number;
  colWidth = (contentWidth - 30) / 2;
  boxWidth = 6 * 28.35;
  boxHeight = 7 * 28.35;

  box1X = MARGEN_LATERAL + (colWidth - boxWidth) / 2;
  box2X = MARGEN_LATERAL + colWidth + 10 + (colWidth - boxWidth) / 2;

  page.drawText("FOTO DEL ROSTRO DEL BENEFICIARIO", { x: MARGEN_LATERAL + colWidth / 2 - 100, y, size: 9, font: boldFont, color: COLOR_NEGRO });

  drawBox(box1X, y, boxWidth, boxHeight, 1.5);

  if (data.foto_rostro_base64) {
    const embedded = await embedImageFromBase64(pdfDoc, data.foto_rostro_base64);
    if (embedded && embedded.image) {
      const img = embedded.image;
      const aspectRatio = img.width / img.height;
      let newWidth = boxWidth - 10;
      let newHeight = newWidth / aspectRatio;
      if (newHeight > boxHeight - 10) {
        newHeight = boxHeight - 10;
        newWidth = newHeight * aspectRatio;
      }
      page.drawImage(img, {
        x: box1X + (boxWidth - newWidth) / 2,
        y: y - boxHeight + 5 + (boxHeight - 10 - newHeight) / 2,
        width: newWidth,
        height: newHeight
      });
    }
  }

  y -= boxHeight;
  page.drawText("Nombre completo:", { x: box1X, y: y, size: 8, font, color: COLOR_NEGRO });
  drawLine(box1X + 65, y - 2, box1X + boxWidth, y - 2);
  if (data.beneficiario) {
    page.drawText(data.beneficiario.substring(0, 30), { x: box1X + 70, y: y - 2, size: 8, font, color: COLOR_NEGRO });
  }

  y -= 14;
  page.drawText("CURP:", { x: box1X, y: y, size: 8, font, color: COLOR_NEGRO });
  drawLine(box1X + 25, y - 2, box1X + boxWidth, y - 2);
  if (data.curp) {
    page.drawText(data.curp.substring(0, 18), { x: box1X + 30, y: y - 2, size: 8, font, color: COLOR_NEGRO });
  }

  page.drawText("FIRMA DEL BENEFICIARIO", { x: MARGEN_LATERAL + colWidth + (colWidth / 2) - 80, y: y + boxHeight + 15, size: 9, font: boldFont, color: COLOR_NEGRO });

  drawBox(box2X, y + boxHeight + 15, boxWidth, boxHeight, 1.5);

  if (data.firma_base64) {
    const embedded = await embedImageFromBase64(pdfDoc, data.firma_base64);
    if (embedded && embedded.image) {
      const img = embedded.image;
      const aspectRatio = img.width / img.height;
      let newWidth = boxWidth - 10;
      let newHeight = newWidth / aspectRatio;
      if (newHeight > boxHeight - 10) {
        newHeight = boxHeight - 10;
        newWidth = newHeight * aspectRatio;
      }
      page.drawImage(img, {
        x: box2X + (boxWidth - newWidth) / 2,
        y: y + 20 + (boxHeight - 10 - newHeight) / 2,
        width: newWidth,
        height: newHeight
      });
    }
  }

  y -= 25;
  page.drawText("Fecha de firma:", { x: box2X, y, size: 8, font, color: COLOR_NEGRO });
  drawLine(box2X + 55, y - 2, box2X + boxWidth, y - 2);
  if (data.fecha_firma) {
    page.drawText(data.fecha_firma, { x: box2X + 60, y: y - 2, size: 8, font, color: COLOR_NEGRO });
  }

  y -= 14;
  page.drawText("Lugar:", { x: box2X, y: y + 34, size: 8, font, color: COLOR_NEGRO });
  drawLine(box2X + 25, y + 32, box2X + boxWidth, y + 32);
  if (data.lugar) {
    page.drawText(data.lugar.substring(0, 30), { x: box2X + 30, y: y + 32, size: 8, font, color: COLOR_NEGRO });
  }

  y -= 50;

  page.drawRectangle({ x: MARGEN_LATERAL, y: y - 5, width: contentWidth, height: 20, color: COLOR_FONDO_GRIS });
  page.drawText("Responsables de la Visita", { x: MARGEN_LATERAL + 10, y, size: 10, font: boldFont, color: COLOR_NEGRO });

  y -= 25;

  page.drawText("Nombre del técnico (PSTyP):", { x: MARGEN_LATERAL, y, size: 9, font, color: COLOR_NEGRO });
  drawLine(MARGEN_LATERAL + 120, y - 2, MARGEN_LATERAL + colWidth, y - 2);
  if (data.pstyp) {
    page.drawText(data.pstyp.substring(0, 40), { x: MARGEN_LATERAL + 125, y: y - 2, size: 9, font, color: COLOR_NEGRO });
  }

  y -= 20;
  page.drawText("Firma del técnico:", { x: MARGEN_LATERAL, y, size: 9, font, color: COLOR_NEGRO });
  drawBox(MARGEN_LATERAL + 70, y - 85, 5 * 28.35, 3 * 28.35, 1);

  y -= 95;
  page.drawText("Fecha:", { x: MARGEN_LATERAL, y, size: 9, font, color: COLOR_NEGRO });
  drawLine(MARGEN_LATERAL + 40, y - 2, MARGEN_LATERAL + 100, y - 2);
  if (data.fecha) {
    page.drawText(data.fecha, { x: MARGEN_LATERAL + 45, y: y - 2, size: 9, font, color: COLOR_NEGRO });
  }

  page.drawText("Vo. Bo.:", { x: col2X, y: y + 80, size: 9, font, color: COLOR_NEGRO });
  drawLine(col2X + 30, y + 78, col2X + col2Width, y + 78);
  if (data.vo_bo) {
    page.drawText(data.vo_bo.substring(0, 35), { x: col2X + 35, y: y + 78, size: 9, font, color: COLOR_NEGRO });
  }

  page.drawEllipse({
    x: col2X + col2Width / 2, y: y + 40,
    xScale: 42, yScale: 42,
    borderColor: COLOR_GRIS_OSCURO, borderWidth: 1, color: COLOR_BLANCO
  });
  page.drawText("SELLO", { x: col2X + col2Width / 2 - 18, y: y + 35, size: 6, font: boldFont, color: COLOR_GRIS_MEDIO });
  page.drawText("INSTITUCIONAL", { x: col2X + col2Width / 2 - 30, y: y + 25, size: 6, font: boldFont, color: COLOR_GRIS_MEDIO });

  page.drawText("Fecha de validación:", { x: col2X, y: y - 10, size: 9, font, color: COLOR_NEGRO });
  drawLine(col2X + 85, y - 12, col2X + col2Width, y - 12);
  if (data.fecha) {
    page.drawText(data.fecha, { x: col2X + 90, y: y - 12, size: 9, font, color: COLOR_NEGRO });
  }

  y -= 50;

  page.drawText("Página 1 de 1", { x: PAGE_WIDTH - MARGEN_LATERAL - 60, y: 20, size: 9, font, color: COLOR_GRIS_MEDIO });

  return pdfDoc.save();
}