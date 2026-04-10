import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "@/db";
import { authMiddleware, requireRole } from "@/middleware/auth";
import { existsTecnicoActivoWithCoordinador } from "@/models/beneficiarios.model";
import {
  createAsignacionActividad,
  createAsignacionBeneficiario,
  createAsignacionCoordinadorTecnico,
  deleteAsignacionActividad,
  deleteAsignacionBeneficiario,
  deleteAsignacionCoordinadorTecnico,
  getAsignacionActividadById,
  getAsignacionBeneficiarioById,
  getAsignacionCoordinadorTecnicoByTecnicoId,
  listAsignacionesActividad,
  listAsignacionesBeneficiario,
  listAsignacionesCoordinadorTecnico,
  updateAsignacionActividad,
  updateAsignacionBeneficiario,
  updateAsignacionCoordinadorTecnico,
} from "@/models/asignaciones.model";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("admin", "coordinador"));

app.get("/coordinador-tecnico", async (c) => {
  const user = c.get("user");
  if (user.rol === "coordinador") {
    const rows = await sql`
      SELECT td.tecnico_id AS id, td.coordinador_id, td.fecha_limite, td.estado_corte, t.nombre AS tecnico_nombre, c.nombre AS coordinador_nombre
      FROM tecnico_detalles td
      JOIN usuarios t ON t.id = td.tecnico_id
      LEFT JOIN usuarios c ON c.id = td.coordinador_id
      WHERE td.coordinador_id = ${user.sub} AND td.activo = true
    `;
    return c.json(rows);
  }
  const rows = await listAsignacionesCoordinadorTecnico();
  return c.json(rows);
});

app.get("/coordinador-tecnico/lista", async (c) => {
  const user = c.get("user");
  if (user.rol === "coordinador") {
    const rows = await sql`
      SELECT td.tecnico_id AS id, td.coordinador_id, td.fecha_limite, td.estado_corte, t.nombre AS tecnico_nombre, c.nombre AS coordinador_nombre
      FROM tecnico_detalles td
      JOIN usuarios t ON t.id = td.tecnico_id
      LEFT JOIN usuarios c ON c.id = td.coordinador_id
      WHERE td.coordinador_id = ${user.sub} AND td.activo = true
    `;
    return c.json(rows);
  }
  const rows = await listAsignacionesCoordinadorTecnico();
  return c.json(rows);
});

app.get("/coordinador-tecnico/:tecnico_id", zValidator("param", z.object({ tecnico_id: z.string().uuid() })), async (c) => {
  const { tecnico_id } = c.req.param();
  const row = await getAsignacionCoordinadorTecnicoByTecnicoId(tecnico_id);
  if (!row) return c.json({ error: "Asignación no encontrada" }, 404);
  return c.json(row);
});

app.post("/coordinador-tecnico", zValidator("json", z.object({ tecnico_id: z.string().uuid(), coordinador_id: z.string().uuid(), fecha_limite: z.string().min(1) })), async (c) => {
  try {
    const body = c.req.valid("json");
    const user = c.get("user");
    if (user.rol === "coordinador" && body.coordinador_id !== user.sub) {
      return c.json({ error: "Solo puede asignar técnicos a su propio coordinador" }, 403);
    }
    const fecha = new Date(body.fecha_limite);
    if (isNaN(fecha.getTime())) {
      return c.json({ error: "fecha_limite debe ser una fecha válida" }, 400);
    }
    const row = await createAsignacionCoordinadorTecnico({ tecnico_id: body.tecnico_id, coordinador_id: body.coordinador_id, fecha_limite: fecha.toISOString() });
    return c.json(row, 201);
  } catch (e) {
    console.error("[Asignaciones] Error al crear coordinador-tecnico:", e);
    return c.json({ error: "Error al asignar coordinador" }, 500);
  }
});

app.delete("/coordinador-tecnico/:tecnico_id", async (c) => {
  const { tecnico_id } = c.req.param();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!tecnico_id || !uuidRegex.test(tecnico_id)) {
    return c.json({ error: "ID de técnico inválido o requerido" }, 400);
  }
  const row = await deleteAsignacionCoordinadorTecnico(tecnico_id);
  if (!row) return c.json({ error: "Asignación no encontrada" }, 404);
  return c.json({ message: "Asignación eliminada" });
});

app.patch("/coordinador-tecnico/:tecnico_id", zValidator("param", z.object({ tecnico_id: z.string().uuid() })), zValidator("json", z.object({ coordinador_id: z.string().uuid().optional(), fecha_limite: z.string().min(1).optional(), activo: z.boolean().optional() })), async (c) => {
  try {
    const { tecnico_id } = c.req.param();
    const body = c.req.valid("json");
    const update: any = { ...body };
    if (body.fecha_limite) {
      const fecha = new Date(body.fecha_limite);
      if (isNaN(fecha.getTime())) {
        return c.json({ error: "fecha_limite debe ser una fecha válida" }, 400);
      }
      update.fecha_limite = fecha.toISOString();
    }
    const row = await updateAsignacionCoordinadorTecnico(tecnico_id, update);
    if (!row) return c.json({ error: "Asignación no encontrada" }, 404);
    return c.json(row);
  } catch (e) {
    console.error("[Asignaciones] Error al actualizar coordinador-tecnico:", e);
    return c.json({ error: "Error al actualizar asignación" }, 500);
  }
});

app.get("/beneficiario", zValidator("query", z.object({ tecnico_id: z.string().uuid().optional(), beneficiario_id: z.string().uuid().optional(), activo: z.enum(["true", "false"]).optional() })), async (c) => {
  const { tecnico_id, beneficiario_id, activo } = c.req.valid("query");
  const rows = await listAsignacionesBeneficiario({ tecnico_id, beneficiario_id, activo: activo === "true" ? true : activo === "false" ? false : undefined });
  return c.json(rows);
});

app.get("/beneficiario/:id", zValidator("param", z.object({ id: z.string().uuid() })), async (c) => {
  const { id } = c.req.param();
  const row = await getAsignacionBeneficiarioById(id);
  if (!row) return c.json({ error: "Asignación no encontrada" }, 404);
  return c.json(row);
});

app.post("/beneficiario", zValidator("json", z.object({ tecnico_id: z.string().uuid(), beneficiario_id: z.string().uuid() })), async (c) => {
  try {
    const body = c.req.valid("json");
    const user = c.get("user");
    if (user.rol === "coordinador") {
      const tieneAcceso = await existsTecnicoActivoWithCoordinador(body.tecnico_id, user.sub);
      if (!tieneAcceso) {
        return c.json({ error: "Sin permisos para asignar este técnico" }, 403);
      }
    }
    const row = await createAsignacionBeneficiario(body.tecnico_id, body.beneficiario_id, user.sub);
    return c.json(row, 201);
  } catch (e) {
    console.error("[Asignaciones] Error al crear asignación beneficiario:", e);
    return c.json({ error: "Error al asignar beneficiario" }, 500);
  }
});

app.delete("/beneficiario/:id", zValidator("param", z.object({ id: z.string().uuid() })), async (c) => {
  const { id } = c.req.param();
  const row = await deleteAsignacionBeneficiario(id);
  if (!row) return c.json({ error: "Asignación no encontrada" }, 404);
  return c.json({ message: "Asignación eliminada" });
});

app.patch("/beneficiario/:id", zValidator("param", z.object({ id: z.string().uuid() })), zValidator("json", z.object({ tecnico_id: z.string().uuid().optional(), beneficiario_id: z.string().uuid().optional(), activo: z.boolean().optional() })), async (c) => {
  const { id } = c.req.param();
  const body = c.req.valid("json");
  const row = await updateAsignacionBeneficiario(id, body);
  if (!row) return c.json({ error: "Asignación no encontrada" }, 404);
  return c.json(row);
});

app.get("/actividad", zValidator("query", z.object({ tecnico_id: z.string().uuid().optional(), actividad_id: z.string().uuid().optional(), activo: z.enum(["true", "false"]).optional() })), async (c) => {
  const { tecnico_id, actividad_id, activo } = c.req.valid("query");
  const rows = await listAsignacionesActividad({ tecnico_id, actividad_id, activo: activo === "true" ? true : activo === "false" ? false : undefined });
  return c.json(rows);
});

app.get("/actividad/:id", zValidator("param", z.object({ id: z.string().uuid() })), async (c) => {
  const { id } = c.req.param();
  const row = await getAsignacionActividadById(id);
  if (!row) return c.json({ error: "Asignación no encontrada" }, 404);
  return c.json(row);
});

app.post("/actividad", zValidator("json", z.object({ tecnico_id: z.string().uuid(), actividad_id: z.string().uuid() })), async (c) => {
  try {
    const body = c.req.valid("json");
    const user = c.get("user");
    if (user.rol === "coordinador") {
      const tieneAcceso = await existsTecnicoActivoWithCoordinador(body.tecnico_id, user.sub);
      if (!tieneAcceso) {
        return c.json({ error: "Sin permisos para asignar este técnico" }, 403);
      }
    }
    const row = await createAsignacionActividad(body.tecnico_id, body.actividad_id, user.sub);
    return c.json(row, 201);
  } catch (e) {
    console.error("[Asignaciones] Error al crear asignación actividad:", e);
    return c.json({ error: "Error al asignar actividad" }, 500);
  }
});

app.delete("/actividad/:id", zValidator("param", z.object({ id: z.string().uuid() })), async (c) => {
  const { id } = c.req.param();
  const row = await deleteAsignacionActividad(id);
  if (!row) return c.json({ error: "Asignación no encontrada" }, 404);
  return c.json({ message: "Asignación eliminada" });
});

app.patch("/actividad/:id", zValidator("param", z.object({ id: z.string().uuid() })), zValidator("json", z.object({ tecnico_id: z.string().uuid().optional(), actividad_id: z.string().uuid().optional(), activo: z.boolean().optional() })), async (c) => {
  const { id } = c.req.param();
  const body = c.req.valid("json");
  const row = await updateAsignacionActividad(id, body);
  if (!row) return c.json({ error: "Asignación no encontrada" }, 404);
  return c.json(row);
});

export default app;