import { sql } from "@/db";

export async function listNotificacionesNoLeidas(destinoId: string) {
  return sql`
    SELECT id, destino_id, destino_tipo, tipo, titulo, cuerpo, leido,
           enviado_push, enviado_email, created_at
    FROM notificaciones
    WHERE destino_id = ${destinoId} AND leido = false
    ORDER BY created_at DESC
  `;
}

export async function markNotificacionLeida(id: string, destinoId: string) {
  const [row] = await sql`
    UPDATE notificaciones
    SET leido = true
    WHERE id = ${id} AND destino_id = ${destinoId}
    RETURNING id, destino_id, tipo, titulo, leido, created_at
  `;
  return row ?? null;
}

export async function markAllNotificacionesLeidas(destinoId: string) {
  await sql`
    UPDATE notificaciones SET leido = true WHERE destino_id = ${destinoId}
  `;
}