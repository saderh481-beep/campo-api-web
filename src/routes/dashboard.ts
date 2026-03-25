import { Hono } from "hono";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { AppEnv } from "@/types/http";
import { getDashboardCoordinador } from "@/controllers/dashboard.controller";

const app = new Hono<AppEnv>();

app.use("*", authMiddleware);
app.get("/coordinador", requireRole("coordinador"), getDashboardCoordinador);

export default app;
