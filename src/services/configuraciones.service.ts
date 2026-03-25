import { findConfiguracionByClave, listConfiguraciones, updateConfiguracion } from "@/models/configuraciones.model";

export async function listarConfiguraciones() {
  return listConfiguraciones();
}

export async function obtenerConfiguracion(clave: string) {
  const row = await findConfiguracionByClave(clave);
  if (!row) return { status: 404 as const, body: { error: "Configuración no encontrada" } };
  return { status: 200 as const, body: row };
}

export async function editarConfiguracion(clave: string, valor: Record<string, unknown>, userId: string) {
  const row = await updateConfiguracion(clave, valor, userId);
  if (!row) return { status: 404 as const, body: { error: "Configuración no encontrada" } };
  return { status: 200 as const, body: row };
}