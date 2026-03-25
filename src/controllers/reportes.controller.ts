import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import { obtenerReporteMensual, obtenerReportePorTecnico } from "@/services/reportes.service";

export async function getReporteMensual(c: Context<AppEnv>) {
  const user = c.get("user");
  const { mes, anio } = c.req.query();
  const m = mes ? Number(mes) : new Date().getMonth() + 1;
  const y = anio ? Number(anio) : new Date().getFullYear();
  const payload = await obtenerReporteMensual(user.rol, user.sub, m, y);
  return c.json(payload);
}

export async function getReporteTecnico(c: Context<AppEnv>) {
  const user = c.get("user");
  const { id } = c.req.param();
  const { desde, hasta } = c.req.query();
  const result = await obtenerReportePorTecnico(user.rol, user.sub, id, desde, hasta);
  return c.json(result.body, result.status);
}
