import { createActividad, deactivateActividad, listActividades, updateActividad, type ActividadInput, type ActividadUpdateInput } from "@/models/actividades.model";

export async function listarActividades() {
  return listActividades();
}

export async function crearActividad(input: ActividadInput, userId: string) {
  return createActividad(input, userId);
}

export async function editarActividad(id: string, input: ActividadUpdateInput) {
  const row = await updateActividad(id, input);
  if (!row) return { status: 404 as const, body: { error: "Actividad no encontrada" } };
  return { status: 200 as const, body: row };
}

export async function eliminarActividad(id: string) {
  const row = await deactivateActividad(id);
  if (!row) return { status: 404 as const, body: { error: "Actividad no encontrada" } };
  return { status: 200 as const, body: { message: "Actividad desactivada" } };
}
