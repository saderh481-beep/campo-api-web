import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireCoordinador } from "@/middleware/auth";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import * as repo from "./repository";
import { crearBeneficiarioSchema, actualizarBeneficiarioSchema, listarBeneficiariosSchema } from "./schema";

const router = new Hono();
router.use("*", requireAuth, requireCoordinador);

// GET /beneficiarios
router.get("/", zValidator("query", listarBeneficiariosSchema), async (c) => {
  const params  = c.req.valid("query");
  const payload = c.get("jwtPayload");

  // Coordinador solo ve beneficiarios de sus técnicos (filtro por coordinador_id en subquery)
  // Admin ve todos
  return c.json(await repo.findAll({ ...params, _coordinadorId: payload.rol === "coordinador" ? payload.sub : undefined }));
});

// GET /beneficiarios/:id
router.get("/:id", async (c) => {
  const beneficiario = await repo.findById(c.req.param("id"));
  if (!beneficiario) throw new NotFoundError("Beneficiario");
  return c.json({ beneficiario });
});

// POST /beneficiarios
router.post("/", zValidator("json", crearBeneficiarioSchema), async (c) => {
  const data        = c.req.valid("json");
  const beneficiario = await repo.create(data);
  return c.json({ beneficiario }, 201);
});

// PATCH /beneficiarios/:id
router.patch("/:id", zValidator("json", actualizarBeneficiarioSchema), async (c) => {
  const beneficiario = await repo.update(c.req.param("id"), c.req.valid("json"));
  if (!beneficiario) throw new NotFoundError("Beneficiario");
  return c.json({ beneficiario });
});

// DELETE /beneficiarios/:id (soft delete)
router.delete("/:id", async (c) => {
  const beneficiario = await repo.update(c.req.param("id"), { activo: false });
  if (!beneficiario) throw new NotFoundError("Beneficiario");
  return c.json({ ok: true });
});

export default router;
