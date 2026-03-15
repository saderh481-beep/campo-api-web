import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireAdmin, requireCoordinador } from "@/middleware/auth";
import * as service from "./service";
import { crearTecnicoSchema, actualizarTecnicoSchema, listarTecnicosSchema } from "./schema";

const router = new Hono();
router.use("*", requireAuth);

// GET /tecnicos — admin ve todos; coordinador solo los suyos
router.get("/", requireCoordinador, zValidator("query", listarTecnicosSchema), async (c) => {
  const params  = c.req.valid("query");
  const payload = c.get("jwtPayload");

  // Coordinador solo puede ver sus propios técnicos
  if (payload.rol === "coordinador") {
    params.coordinadorId = payload.sub;
  }

  return c.json(await service.listar(params));
});

// GET /tecnicos/:id
router.get("/:id", requireCoordinador, async (c) => {
  return c.json({ tecnico: await service.obtener(c.req.param("id")) });
});

// POST /tecnicos
router.post("/", requireAdmin, zValidator("json", crearTecnicoSchema), async (c) => {
  const tecnico = await service.crear(c.req.valid("json"));
  return c.json({ tecnico }, 201);
});

// PATCH /tecnicos/:id
router.patch("/:id", requireAdmin, zValidator("json", actualizarTecnicoSchema), async (c) => {
  const tecnico = await service.actualizar(c.req.param("id"), c.req.valid("json"));
  return c.json({ tecnico });
});

// POST /tecnicos/:id/regenerar-codigo
router.post("/:id/regenerar-codigo", requireAdmin, async (c) => {
  const result = await service.regenerarCodigo(c.req.param("id"));
  return c.json({ tecnico: result });
});

// DELETE /tecnicos/:id (soft delete + revoca código Redis)
router.delete("/:id", requireAdmin, async (c) => {
  await service.desactivar(c.req.param("id"));
  return c.json({ ok: true });
});

export default router;
