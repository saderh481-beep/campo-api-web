import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import {
  crearDocumentoPlantilla,
  editarDocumentoPlantilla,
  eliminarDocumentoPlantilla,
  listarDocumentosPlantilla,
} from "@/services/documentos-plantilla.service";
import type { DocumentoPlantillaInput, DocumentoPlantillaUpdateInput } from "@/models/documentos-plantilla.model";

export async function getDocumentosPlantilla(c: Context<AppEnv>) {
  const rows = await listarDocumentosPlantilla(true);
  return c.json(rows);
}

export async function getDocumentosPlantillaActivos(c: Context<AppEnv>) {
  const rows = await listarDocumentosPlantilla(false);
  return c.json(rows);
}

export async function postDocumentoPlantilla(c: Context<AppEnv>, body: DocumentoPlantillaInput) {
  const user = c.get("user");
  const row = await crearDocumentoPlantilla(body, user.sub);
  return c.json(row, 201);
}

export async function patchDocumentoPlantilla(c: Context<AppEnv>, body: DocumentoPlantillaUpdateInput) {
  const { id } = c.req.param();
  const result = await editarDocumentoPlantilla(id, body);
  return c.json(result.body, result.status);
}

export async function deleteDocumentoPlantilla(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const result = await eliminarDocumentoPlantilla(id);
  return c.json(result.body, result.status);
}