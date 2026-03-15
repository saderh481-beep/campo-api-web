import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireAdmin, requireCoordinador } from "@/middleware/auth";
import { NotFoundError } from "@/lib/errors";
import * as repo from "./repository";
import { crearActividadSchema, actualizarActividadSchema, listarActividadesSchema } from "./schema";

const router = new Hono();
router.use("*", requireAuth);

router.get("/", requireCoordinador, zValidator("query", listarActividadesSchema), async (c) => {
  return c.json(await repo.findAll(c.req.valid("query")));
});

router.get("/:id", requireCoordinador, async (c) => {
  const actividad = await repo.findById(c.req.param("id"));
  if (!actividad) throw new NotFoundError("Actividad");
  return c.json({ actividad });
});

router.post("/", requireAdmin, zValidator("json", crearActividadSchema), async (c) => {
  return c.json({ actividad: await repo.create(c.req.valid("json")) }, 201);
});

router.patch("/:id", requireAdmin, zValidator("json", actualizarActividadSchema), async (c) => {
  const actividad = await repo.update(c.req.param("id"), c.req.valid("json"));
  if (!actividad) throw new NotFoundError("Actividad");
  return c.json({ actividad });
});

router.delete("/:id", requireAdmin, async (c) => {
  const actividad = await repo.update(c.req.param("id"), { activo: false });
  if (!actividad) throw new NotFoundError("Actividad");
  return c.json({ ok: true });
});

export default router;
