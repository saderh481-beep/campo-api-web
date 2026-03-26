import {
  createLocalidad,
  deactivateLocalidad,
  existsZonaActiva,
  hasBeneficiariosActivosByLocalidadId,
  listLocalidades,
  updateLocalidad,
  type LocalidadInput,
  type LocalidadUpdateInput,
} from "@/models/localidades.model";

export async function listarLocalidades() {
  return listLocalidades();
}

export async function crearLocalidad(input: LocalidadInput, userId: string) {
  if (input.zona_id && !(await existsZonaActiva(input.zona_id))) {
    return { status: 400 as const, body: { error: "Zona no encontrada" } };
  }

  const row = await createLocalidad(input, userId);
  return { status: 201 as const, body: row };
}

export async function editarLocalidad(id: string, input: LocalidadUpdateInput) {
  if (input.zona_id && !(await existsZonaActiva(input.zona_id))) {
    return { status: 400 as const, body: { error: "Zona no encontrada" } };
  }

  const row = await updateLocalidad(id, input);
  if (!row) return { status: 404 as const, body: { error: "Localidad no encontrada" } };
  return { status: 200 as const, body: row };
}

export async function eliminarLocalidad(id: string) {
  if (await hasBeneficiariosActivosByLocalidadId(id)) {
    return { status: 409 as const, body: { error: "No se puede desactivar una localidad con beneficiarios activos" } };
  }

  const row = await deactivateLocalidad(id);
  if (!row) return { status: 404 as const, body: { error: "Localidad no encontrada" } };
  return { status: 200 as const, body: { message: "Localidad desactivada" } };
}