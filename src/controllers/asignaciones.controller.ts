import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import {
  editarAsignacionActividad,
  editarAsignacionBeneficiario,
  editarAsignacionCoordinadorTecnico,
  asignarActividad,
  asignarBeneficiario,
  asignarCoordinadorTecnico,
  listarAsignacionesActividad,
  listarAsignacionesBeneficiario,
  listarAsignacionesCoordinadorTecnico,
  obtenerAsignacionActividad,
  obtenerAsignacionBeneficiario,
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

export async function getAsignacionesCoordinadorTecnico(c: Context<AppEnv>) {
  const { tecnico_id } = c.req.query();
  const rows = await listarAsignacionesCoordinadorTecnico(tecnico_id);
  return c.json(rows);
}

export async function getAsignacionCoordinadorTecnicoByTecnicoId(c: Context<AppEnv>) {
  const { tecnico_id } = c.req.param();
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

export async function patchAsignacionCoordinadorTecnico(c: Context<AppEnv>, body: { coordinador_id?: string; fecha_limite?: string; activo?: boolean }) {
  const { tecnico_id } = c.req.param();
  const result = await editarAsignacionCoordinadorTecnico(tecnico_id, body);
  return c.json(result.body, result.status);
}

export async function getAsignacionesBeneficiario(c: Context<AppEnv>) {
  const { tecnico_id, beneficiario_id, activo } = c.req.query();
  const rows = await listarAsignacionesBeneficiario({
    tecnico_id,
    beneficiario_id,
    activo: activo === undefined ? undefined : activo === "true",
  });
  return c.json(rows);
}

export async function getAsignacionBeneficiarioById(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const row = await obtenerAsignacionBeneficiario(id);
  if (!row) return c.json({ error: "Asignación no encontrada" }, 404);
  return c.json(row);
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

export async function patchAsignacionBeneficiario(c: Context<AppEnv>, body: { tecnico_id?: string; beneficiario_id?: string; activo?: boolean }) {
  const { id } = c.req.param();
  const result = await editarAsignacionBeneficiario(id, body);
  return c.json(result.body, result.status);
}

export async function getAsignacionesActividad(c: Context<AppEnv>) {
  const { tecnico_id, actividad_id, activo } = c.req.query();
  const rows = await listarAsignacionesActividad({
    tecnico_id,
    actividad_id,
    activo: activo === undefined ? undefined : activo === "true",
  });
  return c.json(rows);
}

export async function getAsignacionActividadById(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const row = await obtenerAsignacionActividad(id);
  if (!row) return c.json({ error: "Asignación de actividad no encontrada" }, 404);
  return c.json(row);
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

export async function patchAsignacionActividad(c: Context<AppEnv>, body: { tecnico_id?: string; actividad_id?: string; activo?: boolean }) {
  const { id } = c.req.param();
  const result = await editarAsignacionActividad(id, body);
  return c.json(result.body, result.status);
}
