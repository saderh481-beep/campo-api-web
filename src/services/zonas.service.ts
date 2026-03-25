import { createZona, deactivateZona, listZonas, updateZona, type ZonaInput, type ZonaUpdateInput } from "@/models/zonas.model";

export async function listarZonas() {
  return listZonas();
}

export async function crearZona(input: ZonaInput, userId: string) {
  return createZona(input, userId);
}

export async function editarZona(id: string, input: ZonaUpdateInput) {
  const row = await updateZona(id, input);
  if (!row) return { status: 404 as const, body: { error: "Zona no encontrada" } };
  return { status: 200 as const, body: row };
}

export async function eliminarZona(id: string) {
  const row = await deactivateZona(id);
  if (!row) return { status: 404 as const, body: { error: "Zona no encontrada" } };
  return { status: 200 as const, body: { message: "Zona desactivada" } };
}