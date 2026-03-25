import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import {
  asignarActividad,
  asignarBeneficiario,
  asignarCoordinadorTecnico,
  obtenerAsignacionCoordinadorTecnico,
  removerAsignacionActividad,
  removerAsignacionBeneficiario,
  removerAsignacionCoordinadorTecnico,
} from "@/services/asignaciones.service";
import type { TecnicoDetalleInput } from "@/models/tecnico-detalles.model";

export async function getAsignacionCoordinadorTecnico(c: Context<AppEnv>) {
  const { tecnico_id } = c.req.query();
  if (!tecnico_id) return c.json({ error: "tecnico_id es requerido" }, 400);
  const row = await obtenerAsignacionCoordinadorTecnico(tecnico_id);
  if (!row) return c.json({ error: "Asignación no encontrada" }, 404);
  return c.json(row);
}

export async function postAsignacionCoordinadorTecnico(c: Context<AppEnv>, body: TecnicoDetalleInput) {
  const result = await asignarCoordinadorTecnico(body);
  return c.json(result.body, result.status);
}

export async function deleteAsignacionCoordinadorTecnico(c: Context<AppEnv>) {
  const { tecnico_id } = c.req.param();
  const result = await removerAsignacionCoordinadorTecnico(tecnico_id);
  return c.json(result.body, result.status);
}

export async function postAsignacionBeneficiario(c: Context<AppEnv>, body: { tecnico_id: string; beneficiario_id: string }) {
  const user = c.get("user");
  const result = await asignarBeneficiario(body.tecnico_id, body.beneficiario_id, user.sub);
  return c.json(result.body, result.status);
}

export async function deleteAsignacionBeneficiario(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const row = await removerAsignacionBeneficiario(id);
  if (!row) return c.json({ error: "Asignación no encontrada" }, 404);
  return c.json({ message: "Asignación removida" });
}

export async function postAsignacionActividad(c: Context<AppEnv>, body: { tecnico_id: string; actividad_id: string }) {
  const user = c.get("user");
  const result = await asignarActividad(body.tecnico_id, body.actividad_id, user.sub);
  return c.json(result.body, result.status);
}

export async function deleteAsignacionActividad(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const row = await removerAsignacionActividad(id);
  if (!row) return c.json({ error: "Asignación de actividad no encontrada" }, 404);
  return c.json({ message: "Asignación de actividad removida" });
}
