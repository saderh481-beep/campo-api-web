import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireAdmin } from "@/middleware/auth";
import { NotFoundError } from "@/lib/errors";
import * as repo from "./repository";
import { crearUsuarioSchema, actualizarUsuarioSchema, listarUsuariosSchema } from "./schema";

const router = new Hono();

router.use("*", requireAuth, requireAdmin);

// GET /usuarios
router.get("/", zValidator("query", listarUsuariosSchema), async (c) => {
  const params = c.req.valid("query");
  const result = await repo.findAll(params);
  return c.json(result);
});

// GET /usuarios/:id
router.get("/:id", async (c) => {
  const usuario = await repo.findById(c.req.param("id"));
  if (!usuario) throw new NotFoundError("Usuario");
  return c.json({ usuario });
});

// POST /usuarios
router.post("/", zValidator("json", crearUsuarioSchema), async (c) => {
  const data    = c.req.valid("json");
  const usuario = await repo.create(data);
  return c.json({ usuario }, 201);
});

// PATCH /usuarios/:id
router.patch("/:id", zValidator("json", actualizarUsuarioSchema), async (c) => {
  const data    = c.req.valid("json");
  const usuario = await repo.update(c.req.param("id"), data);
  if (!usuario) throw new NotFoundError("Usuario");
  return c.json({ usuario });
});

// DELETE /usuarios/:id (soft delete)
router.delete("/:id", async (c) => {
  const usuario = await repo.update(c.req.param("id"), { activo: false });
  if (!usuario) throw new NotFoundError("Usuario");
  return c.json({ ok: true });
});

export default router;
