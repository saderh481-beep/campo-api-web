import { getCoordinadorMetricas } from "@/models/dashboard.model";

export async function obtenerDashboardCoordinador(coordinadorId: string) {
  return getCoordinadorMetricas(coordinadorId);
}
