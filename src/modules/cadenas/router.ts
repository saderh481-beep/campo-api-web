import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireAdmin, requireCoordinador } from "@/middleware/auth";
import { NotFoundError } from "@/lib/errors";
import * as repo from "./repository";
import { crearCadenaSchema, actualizarCadenaSchema, listarCadenasSchema } from "./schema";

const router = new Hono();
router.use("*", requireAuth);

router.get("/", requireCoordinador, zValidator("query", listarCadenasSchema), async (c) => {
  return c.json(await repo.findAll(c.req.valid("query")));
});

router.get("/:id", requireCoordinador, async (c) => {
  const cadena = await repo.findById(c.req.param("id"));
  if (!cadena) throw new NotFoundError("Cadena productiva");
  return c.json({ cadena });
});

router.post("/", requireAdmin, zValidator("json", crearCadenaSchema), async (c) => {
  const { nombre } = c.req.valid("json");
  const cadena     = await repo.create(nombre, c.get("jwtPayload").sub);
  return c.json({ cadena }, 201);
});

router.patch("/:id", requireAdmin, zValidator("json", actualizarCadenaSchema), async (c) => {
  const cadena = await repo.update(c.req.param("id"), c.req.valid("json"));
  if (!cadena) throw new NotFoundError("Cadena productiva");
  return c.json({ cadena });
});

router.delete("/:id", requireAdmin, async (c) => {
  const cadena = await repo.update(c.req.param("id"), { activo: false });
  if (!cadena) throw new NotFoundError("Cadena productiva");
  return c.json({ ok: true });
});

export default router;
