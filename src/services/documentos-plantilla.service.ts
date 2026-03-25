import {
  createDocumentoPlantilla,
  deactivateDocumentoPlantilla,
  listDocumentosPlantilla,
  updateDocumentoPlantilla,
  type DocumentoPlantillaInput,
  type DocumentoPlantillaUpdateInput,
} from "@/models/documentos-plantilla.model";

export async function listarDocumentosPlantilla(includeInactive = false) {
  return listDocumentosPlantilla(includeInactive);
}

export async function crearDocumentoPlantilla(input: DocumentoPlantillaInput, userId: string) {
  return createDocumentoPlantilla(input, userId);
}

export async function editarDocumentoPlantilla(id: string, input: DocumentoPlantillaUpdateInput) {
  const row = await updateDocumentoPlantilla(id, input);
  if (!row) return { status: 404 as const, body: { error: "Documento no encontrado" } };
  return { status: 200 as const, body: row };
}

export async function eliminarDocumentoPlantilla(id: string) {
  const row = await deactivateDocumentoPlantilla(id);
  if (!row) return { status: 404 as const, body: { error: "Documento no encontrado" } };
  return { status: 200 as const, body: { message: "Documento desactivado" } };
}