import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "@/middleware/auth";
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
app.use("*", authMiddleware, requireRole("admin"));

app.get("/coordinador-tecnico", zValidator("query", z.object({ tecnico_id: z.string().uuid() })), async (c) => {
  const { tecnico_id } = c.req.valid("query");
  const rows = await listAsignacionesCoordinadorTecnico(tecnico_id);
  return c.json(rows);
});

app.get("/coordinador-tecnico/lista", zValidator("query", z.object({ tecnico_id: z.string().uuid().optional() })), async (c) => {
  const { tecnico_id } = c.req.valid("query");
  const rows = await listAsignacionesCoordinadorTecnico(tecnico_id);
  return c.json(rows);
});

app.get("/coordinador-tecnico/:tecnico_id", zValidator("param", z.object({ tecnico_id: z.string().uuid() })), async (c) => {
  const { tecnico_id } = c.req.param();
  const row = await getAsignacionCoordinadorTecnicoByTecnicoId(tecnico_id);
  if (!row) return c.json({ error: "Asignación no encontrada" }, 404);
  return c.json(row);
});

app.post("/coordinador-tecnico", zValidator("json", z.object({ tecnico_id: z.string().uuid(), coordinador_id: z.string().uuid(), fecha_limite: z.string().datetime() })), async (c) => {
  const body = c.req.valid("json");
  const row = await createAsignacionCoordinadorTecnico({ tecnico_id: body.tecnico_id, coordinador_id: body.coordinador_id, fecha_limite: body.fecha_limite });
  return c.json(row, 201);
});

app.delete("/coordinador-tecnico/:tecnico_id", zValidator("param", z.object({ tecnico_id: z.string().uuid() })), async (c) => {
  const { tecnico_id } = c.req.param();
  const row = await deleteAsignacionCoordinadorTecnico(tecnico_id);
  if (!row) return c.json({ error: "Asignación no encontrada" }, 404);
  return c.json({ message: "Asignación eliminada" });
});

app.patch("/coordinador-tecnico/:tecnico_id", zValidator("param", z.object({ tecnico_id: z.string().uuid() })), zValidator("json", z.object({ coordinador_id: z.string().uuid().optional(), fecha_limite: z.string().datetime().optional(), activo: z.boolean().optional() })), async (c) => {
  const { tecnico_id } = c.req.param();
  const body = c.req.valid("json");
  const row = await updateAsignacionCoordinadorTecnico(tecnico_id, body);
  if (!row) return c.json({ error: "Asignación no encontrada" }, 404);
  return c.json(row);
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
  const body = c.req.valid("json");
  const user = c.get("user");
  const row = await createAsignacionBeneficiario(body.tecnico_id, body.beneficiario_id, user.sub);
  return c.json(row, 201);
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
  const body = c.req.valid("json");
  const user = c.get("user");
  const row = await createAsignacionActividad(body.tecnico_id, body.actividad_id, user.sub);
  return c.json(row, 201);
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