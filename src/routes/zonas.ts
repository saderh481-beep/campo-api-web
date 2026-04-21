import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware, requireRole } from "@/routes/middlewares/middleware/auth";
import { getZonas, postZona, patchZona, deleteZona } from "@/application/controllers/zona.controller";
import { ZonaCreateDto, ZonaUpdateDto, ZonaParamsDto } from "@/application/dto/zona.dto";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();
app.use("*", authMiddleware, requireRole("admin"));

app.get("/", getZonas);

app.post("/", zValidator("json", ZonaCreateDto), async (c) => {
  const body = c.req.valid("json");
  return postZona(c, body);
});

app.patch("/:id", zValidator("param", ZonaParamsDto), zValidator("json", ZonaUpdateDto), async (c) => {
  const { id } = c.req.param();
  const body = c.req.valid("json");
  return patchZona(c, id, body);
});

app.delete("/:id", zValidator("param", ZonaParamsDto), async (c) => {
  const { id } = c.req.param();
  return deleteZona(c, id);
});

export default app;