import { listNotificacionesNoLeidas, markAllNotificacionesLeidas, markNotificacionLeida } from "@/models/notificaciones.model";

export async function listarNotificaciones(destinoId: string) {
  return listNotificacionesNoLeidas(destinoId);
}

export async function marcarNotificacionLeida(id: string, destinoId: string) {
  await markNotificacionLeida(id, destinoId);
  return { message: "Marcada como leída" };
}

export async function marcarTodasLasNotificacionesLeidas(destinoId: string) {
  await markAllNotificacionesLeidas(destinoId);
  return { message: "Todas marcadas como leídas" };
}