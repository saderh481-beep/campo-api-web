import { listNotificacionesNoLeidas, markAllNotificacionesLeidas, markNotificacionLeida } from "@/models/notificaciones.model";

export async function listarNotificaciones(destinoId: string) {
  return listNotificacionesNoLeidas(destinoId);
}

export async function marcarNotificacionLeida(id: string, destinoId: string) {
  const row = await markNotificacionLeida(id, destinoId);
  if (!row) {
    return { status: 404 as const, body: { error: "Notificación no encontrada" } };
  }

  return { status: 200 as const, body: { message: "Marcada como leída", notificacion: row } };
}

export async function marcarTodasLasNotificacionesLeidas(destinoId: string) {
  await markAllNotificacionesLeidas(destinoId);
  return { status: 200 as const, body: { message: "Todas marcadas como leídas" } };
}