import { Hono } from "hono";
import { authMiddleware, requireRole } from "@/routes/middlewares/middleware/auth";
import { getCoordinadorMetricas } from "@/data/models/dashboard.model";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();

app.use("*", authMiddleware);
app.get("/coordinador", requireRole("coordinador"), async (c) => {
  const user = c.get("user");
  const data = await getCoordinadorMetricas(user.sub);
  return c.json(data);
});

export default app;