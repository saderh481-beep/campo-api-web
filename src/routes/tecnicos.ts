import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createHash, randomInt } from "node:crypto";
import { sql } from "@/db";
import { authMiddleware, requireRole } from "@/middleware/auth";
import { applyCortesVencidos, cerrarCorteById, deactivateTecnico, existsCorreoEnUsuarioActivo, findTecnicoById, isCoordinadorActivo, listAsignacionesByTecnicoId, listTecnicosByRole, updateTecnico, updateTecnicoCodigo, type TecnicoUpdateInput } from "@/models/tecnicos.model";
import { CodigoAccesoService } from "@/validators/codigo-acceso.validator";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();

function hashSHA512(input: string): string {
  return createHash("sha512").update(input).digest("hex");
}

app.use("*", authMiddleware);

app.get("/", requireRole("admin", "coordinador"), async (c) => {
  try {
    const user = c.get("user");
    const rows = await listTecnicosByRole(user.sub, user.rol);
    return c.json(rows);
  } catch (e) {
    console.error("[Tecnicos] Error al listar técnicos:", e);
    return c.json({ error: "Error al obtener técnicos" }, 500);
  }
});

app.get(
  "/:id",
  requireRole("admin", "coordinador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = c.req.param();
      const user = c.get("user");
      const tecnico = await findTecnicoById(id);
      if (!tecnico) return c.json({ error: "Técnico no encontrado" }, 404);
      if (user.rol === "coordinador" && tecnico.coordinador_id !== user.sub) {
        return c.json({ error: "Sin permisos" }, 403);
      }
      const asignaciones = await listAsignacionesByTecnicoId(id);
      return c.json({ ...tecnico, asignaciones });
    } catch (e) {
      console.error("[Tecnicos] Error al obtener técnico:", e);
      return c.json({ error: "Error al obtener técnico" }, 500);
    }
  }
);

app.post(
  "/",
  requireRole("admin", "coordinador"),
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2),
      correo: z.string().email(),
      telefono: z.string().optional(),
      coordinador_id: z.string().uuid(),
      fecha_limite: z.string().datetime().optional(),
    })
  ),
  async (c) => {
    try {
      const body = c.req.valid("json");
      const user = c.get("user");

      if (user.rol === "coordinador" && body.coordinador_id !== user.sub) {
        return c.json({ error: "No puedes asignar otro coordinador" }, 403);
      }

      const [existingCoordinador] = await sql`
        SELECT id FROM usuarios WHERE id = ${body.coordinador_id} AND rol = 'coordinador' AND activo = true
      `;
      if (!existingCoordinador) {
        return c.json({ error: "Coordinador inválido o inactivo" }, 400);
      }

      const [existing] = await sql`
        SELECT id FROM usuarios WHERE correo = ${body.correo} AND activo = true
      `;
      if (existing) {
        return c.json({ error: "El correo ya está registrado" }, 409);
      }

      const codigoService = new CodigoAccesoService();
      const codigo = await codigoService.generar('tecnico');
      const hashCodigo = codigoService.hashear(codigo);

      const [row] = await sql`
        INSERT INTO usuarios (correo, nombre, rol, telefono, codigo_acceso, hash_codigo_acceso)
        VALUES (${body.correo}, ${body.nombre}, 'tecnico', ${body.telefono ?? null}, ${codigo}, ${hashCodigo})
        RETURNING id, nombre, correo, rol, telefono, activo, created_at
      `;

      const [detalle] = await sql`
        INSERT INTO tecnico_detalles (tecnico_id, coordinador_id, fecha_limite, estado_corte, activo)
        VALUES (${row.id}, ${body.coordinador_id}, ${body.fecha_limite ? body.fecha_limite : null}, 'en_servicio', true)
        RETURNING id
      `;

      return c.json({ ...row, detalle, codigo }, 201);
    } catch (e) {
      console.error("[Tecnicos] Error al crear:", e);
      return c.json({ error: "Error al crear técnico" }, 500);
    }
  }
);

app.patch(
  "/:id",
  requireRole("admin", "coordinador"),
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
    try {
      const { id } = c.req.param();
      const user = c.get("user");
      const body = c.req.valid("json");
      const tecnico = await findTecnicoById(id);
      if (!tecnico) return c.json({ error: "Técnico no encontrado" }, 404);
      if (user.rol === "coordinador" && tecnico.coordinador_id !== user.sub) {
        return c.json({ error: "Sin permisos" }, 403);
      }
      if (body.correo && await existsCorreoEnUsuarioActivo(body.correo)) {
        return c.json({ error: "El correo ya está registrado" }, 409);
      }
      if (body.coordinador_id && !(await isCoordinadorActivo(body.coordinador_id))) {
        return c.json({ error: "Coordinador inválido o inactivo" }, 400);
      }
      const result = await updateTecnico(id, body as TecnicoUpdateInput);
      if (!result) return c.json({ error: "Técnico no encontrado" }, 404);
      return c.json(result);
    } catch (e) {
      console.error("[Tecnicos] Error al actualizar técnico:", e);
      return c.json({ error: "Error al actualizar técnico" }, 500);
    }
  }
);

app.post(
  "/:id/codigo",
  requireRole("admin"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = c.req.param();
      const tecnico = await findTecnicoById(id);
      if (!tecnico) return c.json({ error: "Técnico no encontrado" }, 404);
      const codigoService = new CodigoAccesoService();
      const codigo = await codigoService.generar('tecnico');
      const hashCodigo = codigoService.hashear(codigo);
      await updateTecnicoCodigo(id, codigo, hashCodigo);
      return c.json({ message: "Código regenerado", codigo });
    } catch (e) {
      console.error("[Tecnicos] Error al regenerar código:", e);
      return c.json({ error: "Error al regenerar código" }, 500);
    }
  }
);

app.post("/aplicar-cortes", requireRole("admin"), async (c) => {
  try {
    const tecnicos = await applyCortesVencidos();
    return c.json({ message: `Corte aplicado a ${tecnicos.length} técnico(s)`, tecnicos });
  } catch (e) {
    console.error("[Tecnicos] Error al aplicar cortes:", e);
    return c.json({ error: "Error al aplicar cortes" }, 500);
  }
});

app.post(
  "/:id/cerrar-corte",
  requireRole("admin", "coordinador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
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
    } catch (e) {
      console.error("[Tecnicos] Error al cerrar corte:", e);
      return c.json({ error: "Error al cerrar corte" }, 500);
    }
  }
);

app.delete(
  "/:id",
  requireRole("admin", "coordinador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = c.req.param();
      const user = c.get("user");
      const tecnico = await findTecnicoById(id);
      if (!tecnico) return c.json({ error: "Técnico no encontrado" }, 404);
      if (user.rol === "coordinador" && tecnico.coordinador_id !== user.sub) {
        return c.json({ error: "Sin permisos" }, 403);
      }
      const result = await deactivateTecnico(id);
      if (!result) return c.json({ error: "Técnico no encontrado" }, 404);
      return c.json({ message: "Técnico desactivado" });
    } catch (e) {
      console.error("[Tecnicos] Error al desactivar técnico:", e);
      return c.json({ error: "Error al desactivar técnico" }, 500);
    }
  }
);

export default app;