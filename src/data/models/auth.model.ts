import { sql } from "@/infrastructure/db";

export async function findUsuarioParaLogin(correo: string) {
  const [usuario] = await sql`
    SELECT id, nombre, correo, rol, hash_codigo_acceso
    FROM usuarios
    WHERE correo = ${correo}
  `;
  return usuario;
}

export async function findTecnicoDetalleParaLogin(usuarioId: string) {
  const [tecnico] = await sql`
    SELECT td.fecha_limite, td.estado_corte
    FROM tecnico_detalles td
    JOIN usuarios u ON u.id = td.tecnico_id
    WHERE td.tecnico_id = ${usuarioId} AND u.rol = 'tecnico' AND td.activo = true
  `;
  return tecnico;
}

export async function marcarTecnicoVencido(usuarioId: string) {
  await sql`
    UPDATE tecnico_detalles
    SET estado_corte = 'suspendido', updated_at = NOW()
    WHERE tecnico_id = ${usuarioId} AND activo = true
  `;
}

export async function createAuthLog(actorId: string, accion: "login" | "logout", ip: string, userAgent: string | null) {
  let validIp: string | null = null;
  if (ip && ip !== "unknown") {
    // Tomar solo la primera IP y limpiar espacios
    const cleanIp = ip.split(",")[0].trim();
    // Validar que sea una IP válida (IPv4)
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanIp)) {
      validIp = cleanIp;
    }
  }
  await sql`
    INSERT INTO auth_logs (actor_id, actor_tipo, accion, ip, user_agent)
    VALUES (${actorId}, 'usuario', ${accion}, ${validIp}::inet, ${userAgent})
  `;
}