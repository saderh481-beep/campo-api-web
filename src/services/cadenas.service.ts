import { createCadena, deactivateCadena, listCadenas, updateCadena, type CadenaInput, type CadenaUpdateInput } from "@/models/cadenas.model";

export async function listarCadenas() {
  return listCadenas();
}

export async function crearCadena(input: CadenaInput, userId: string) {
  return createCadena(input, userId);
}

export async function editarCadena(id: string, input: CadenaUpdateInput) {
  const row = await updateCadena(id, input);
  if (!row) return { status: 404 as const, body: { error: "Cadena no encontrada" } };
  return { status: 200 as const, body: row };
}

export async function eliminarCadena(id: string) {
  const row = await deactivateCadena(id);
  if (!row) return { status: 404 as const, body: { error: "Cadena no encontrada" } };
  return { status: 200 as const, body: { message: "Cadena desactivada" } };
}
