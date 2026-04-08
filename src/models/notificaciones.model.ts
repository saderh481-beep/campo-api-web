import { sql } from "@/db";

export type NotificacionInput = {
  destino_id: string;
  destino_tipo: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
};

export async function listNotificacionesNoLeidas(destinoId: string) {
  return await sql`
    SELECT id, destino_id, destino_tipo, tipo, titulo, cuerpo, leido,
           enviado_push, enviado_email, created_at
    FROM notificaciones
    WHERE destino_id = ${destinoId} AND leido = false
    ORDER BY created_at DESC
  `;
}

export async function listNotificacionesByDestino(destinoId: string, limit = 50) {
  return await sql`
    SELECT id, destino_id, destino_tipo, tipo, titulo, cuerpo, leido,
           enviado_push, enviado_email, created_at
    FROM notificaciones
    WHERE destino_id = ${destinoId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

export async function findNotificacionById(id: string) {
  const [row] = await sql`
    SELECT id, destino_id, destino_tipo, tipo, titulo, cuerpo, leido,
           enviado_push, enviado_email, created_at
    FROM notificaciones
    WHERE id = ${id}
  `;
  return row ?? null;
}

export async function createNotificacion(input: NotificacionInput) {
  const [row] = await sql`
    INSERT INTO notificaciones (destino_id, destino_tipo, tipo, titulo, cuerpo)
    VALUES (${input.destino_id}, ${input.destino_tipo}, ${input.tipo}, ${input.titulo}, ${input.cuerpo})
    RETURNING id, destino_id, destino_tipo, tipo, titulo, cuerpo, leido, enviado_push, enviado_email, created_at
  `;
  return row;
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
  const result = await sql`
    UPDATE notificaciones SET leido = true WHERE destino_id = ${destinoId} AND leido = false
    RETURNING id
  `;
  return result;
}

export async function deleteNotificacion(id: string, destinoId: string) {
  const [row] = await sql`
    DELETE FROM notificaciones
    WHERE id = ${id} AND destino_id = ${destinoId}
    RETURNING id
  `;
  return row ?? null;
}