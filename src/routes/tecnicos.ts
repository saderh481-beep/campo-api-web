import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { hash } from "bcryptjs";
import { randomInt } from "node:crypto";
import { authMiddleware, requireRole } from "@/middleware/auth";
import { applyCortesVencidos, cerrarCorteById, deactivateTecnico, existsCorreoEnUsuarioActivo, findTecnicoById, isCoordinadorActivo, listAsignacionesByTecnicoId, listTecnicosByRole, updateTecnico, updateTecnicoCodigo, type TecnicoUpdateInput } from "@/models/tecnicos.model";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware);

app.get("/", requireRole("admin", "coordinador"), async (c) => {
  const user = c.get("user");
  const rows = await listTecnicosByRole(user.sub, user.rol);
  return c.json(rows);
});

app.get(
  "/:id",
  requireRole("admin", "coordinador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.param();
    const user = c.get("user");
    const tecnico = await findTecnicoById(id);
    if (!tecnico) return c.json({ error: "Técnico no encontrado" }, 404);
    if (user.rol === "coordinador" && tecnico.coordinador_id !== user.sub) {
      return c.json({ error: "Sin permisos" }, 403);
    }
    const asignaciones = await listAsignacionesByTecnicoId(id);
    return c.json({ ...tecnico, asignaciones });
  }
);

app.post(
  "/",
  requireRole("admin"),
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2),
      correo: z.string().email(),
      telefono: z.string().optional(),
      coordinador_id: z.string().uuid(),
      fecha_limite: z.string().datetime(),
    })
  ),
  async (c) => {
    return c.json({ error: "La creación de técnicos se realiza desde /usuarios con rol 'tecnico'." }, 405);
  }
);

app.patch(
  "/:id",
  requireRole("admin"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2).optional(),
      correo: z.string().email().optional(),
      telefono: z.string().optional(),
      coordinador_id: z.string().uuid().optional(),
      fecha_limite: z.string().datetime().optional(),
    })
  ),
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");
    if (body.correo && await existsCorreoEnUsuarioActivo(body.correo)) {
      return c.json({ error: "El correo ya está registrado" }, 409);
    }
    if (body.coordinador_id && !(await isCoordinadorActivo(body.coordinador_id))) {
      return c.json({ error: "Coordinador inválido o inactivo" }, 400);
    }
    const result = await updateTecnico(id, body as TecnicoUpdateInput);
    if (!result) return c.json({ error: "Técnico no encontrado" }, 404);
    return c.json(result);
  }
);

app.post(
  "/:id/codigo",
  requireRole("admin"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.param();
    const tecnico = await findTecnicoById(id);
    if (!tecnico) return c.json({ error: "Técnico no encontrado" }, 404);
    const codigo = randomInt(10000, 100000).toString();
    const hashCodigo = await hash(codigo, 12);
    await updateTecnicoCodigo(id, codigo, hashCodigo);
    return c.json({ message: "Código regenerado", codigo });
  }
);

app.post("/aplicar-cortes", requireRole("admin"), async (c) => {
  const tecnicos = await applyCortesVencidos();
  return c.json({ message: `Corte aplicado a ${tecnicos.length} técnico(s)`, tecnicos });
});

app.post(
  "/:id/cerrar-corte",
  requireRole("admin", "coordinador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.param();
    const user = c.get("user");
    const tecnico = await findTecnicoById(id);
    if (!tecnico) return c.json({ error: "Técnico no encontrado" }, 404);
    if (user.rol === "coordinador" && tecnico.coordinador_id !== user.sub) {
      return c.json({ error: "Sin permisos sobre este técnico" }, 403);
    }
    const result = await cerrarCorteById(id);
    if (!result) return c.json({ error: "Asignación de corte no encontrada" }, 404);
    return c.json({ message: "Período cerrado", tecnico: result });
  }
);

app.delete(
  "/:id",
  requireRole("admin"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.param();
    const result = await deactivateTecnico(id);
    if (!result) return c.json({ error: "Técnico no encontrado" }, 404);
    return c.json({ message: "Técnico desactivado" });
  }
);

export default app;