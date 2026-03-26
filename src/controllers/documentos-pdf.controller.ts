import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import { actualizarDocumentoPdf, crearDocumentoPdf, eliminarDocumentoPdf, listarDocumentosPdf } from "@/services/documentos-pdf.service";
import type { DocumentoPdfUpdateInput } from "@/models/documentos-pdf.model";

export async function getDocumentosPdf(c: Context<AppEnv>) {
  const rows = await listarDocumentosPdf();
  return c.json(rows);
}

export async function postDocumentoPdf(c: Context<AppEnv>) {
  const user = c.get("user");
  const formData = await c.req.formData();
  const archivo = formData.get("archivo");
  const clave = formData.get("clave");
  const nombre = formData.get("nombre");
  const descripcion = formData.get("descripcion");

  if (!(archivo instanceof File) || typeof clave !== "string" || typeof nombre !== "string") {
    return c.json({ error: "archivo, clave y nombre son requeridos" }, 400);
  }

  const nombreArchivo = archivo.name.toLowerCase();
  const esPdfPorMime = archivo.type === "application/pdf";
  const esPdfPorNombre = nombreArchivo.endsWith(".pdf");
  if (!esPdfPorMime && !esPdfPorNombre) {
    return c.json({ error: "El archivo debe ser PDF" }, 400);
  }

  const row = await crearDocumentoPdf(
    archivo,
    {
      clave,
      nombre,
      descripcion: typeof descripcion === "string" ? descripcion : undefined,
    },
    user.sub
  );

  return c.json(row, 201);
}

export async function patchDocumentoPdf(c: Context<AppEnv>, body: DocumentoPdfUpdateInput) {
  const { id } = c.req.param();
  const result = await actualizarDocumentoPdf(id, body);
  return c.json(result.body, result.status);
}

export async function deleteDocumentoPdf(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const result = await eliminarDocumentoPdf(id);
  return c.json(result.body, result.status);
}
