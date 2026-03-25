import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import { obtenerDashboardCoordinador } from "@/services/dashboard.service";

export async function getDashboardCoordinador(c: Context<AppEnv>) {
  const user = c.get("user");
  const payload = await obtenerDashboardCoordinador(user.sub);
  return c.json(payload);
}
