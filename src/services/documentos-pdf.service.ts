import { createHash } from "node:crypto";
import { subirPDF } from "@/lib/cloudinary";
import {
  createDocumentoPdf,
  deactivateDocumentoPdf,
  listDocumentosPdf,
  updateDocumentoPdf,
  type DocumentoPdfUpdateInput,
} from "@/models/documentos-pdf.model";

export async function listarDocumentosPdf() {
  return listDocumentosPdf();
}

export async function crearDocumentoPdf(file: File, metadata: { clave: string; nombre: string; descripcion?: string }, userId: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const publicId = `${metadata.clave}_${Date.now()}`;
  const upload = await subirPDF(buffer, "campo/plantillas-pdf", publicId);

  return createDocumentoPdf({
    clave: metadata.clave,
    nombre: metadata.nombre,
    descripcion: metadata.descripcion,
    mimeType: file.type || "application/pdf",
    bytes: buffer.length,
    r2Key: upload.secure_url,
    sha256,
    createdBy: userId,
  });
}

export async function actualizarDocumentoPdf(id: string, input: DocumentoPdfUpdateInput) {
  const row = await updateDocumentoPdf(id, input);
  if (!row) {
    return { status: 404 as const, body: { error: "Documento PDF no encontrado" } };
  }
  return { status: 200 as const, body: row };
}

export async function eliminarDocumentoPdf(id: string) {
  const row = await deactivateDocumentoPdf(id);
  if (!row) {
    return { status: 404 as const, body: { error: "Documento PDF no encontrado" } };
  }
  return { status: 200 as const, body: { message: "Documento PDF desactivado" } };
}
