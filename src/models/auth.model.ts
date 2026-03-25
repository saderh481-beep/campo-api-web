import { sql } from "@/db";

export async function findUsuarioParaLogin(correo: string) {
  const [usuario] = await sql`
    SELECT id, nombre, correo, rol, hash_codigo_acceso
    FROM usuarios
    WHERE correo = ${correo} AND activo = true
  `;
  return usuario;
}

export async function findTecnicoDetalleParaLogin(usuarioId: string) {
  const [tecnico] = await sql`
    SELECT td.fecha_limite, td.estado_corte
    FROM tecnico_detalles td
    JOIN usuarios u ON u.id = td.tecnico_id
    WHERE td.tecnico_id = ${usuarioId} AND u.rol = 'tecnico' AND td.activo = true AND u.activo = true
  `;
  return tecnico;
}

export async function marcarTecnicoVencido(usuarioId: string) {
  await sql`
    UPDATE tecnico_detalles
    SET estado_corte = 'corte_aplicado', updated_at = NOW()
    WHERE tecnico_id = ${usuarioId} AND activo = true
  `;
}

export async function createAuthLog(actorId: string, accion: "login" | "logout", ip: string, userAgent: string | null) {
  await sql`
    INSERT INTO auth_logs (actor_id, actor_tipo, accion, ip, user_agent)
    VALUES (${actorId}, 'usuario', ${accion}, ${ip}, ${userAgent})
  `;
}