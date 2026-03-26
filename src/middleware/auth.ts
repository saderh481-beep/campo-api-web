import { createMiddleware } from "hono/factory";
import { redis } from "@/lib/redis";
import { findConfiguracionByClave } from "@/models/configuraciones.model";
import { findTecnicoDetalleParaLogin, marcarTecnicoVencido } from "@/models/auth.model";
import type { JwtPayload } from "@/lib/jwt";
import type { AppEnv, SessionPayload } from "@/types/http";

type Env = AppEnv & { Variables: { user: JwtPayload; sessionToken: string } };

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const authHeader = c.req.header("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) return c.json({ error: "No autenticado" }, 401);

  const rawSession = await redis.get(`session:${token}`);
  if (!rawSession) return c.json({ error: "Token invalido o expirado" }, 401);

  let session: SessionPayload;
  try {
    session = JSON.parse(rawSession) as SessionPayload;
  } catch {
    return c.json({ error: "Sesion invalida" }, 401);
  }

  // Bloqueo automático y sincronización del estado de corte para técnicos.
  // Se consulta el estado vigente en BD en cada request para evitar sesiones desfasadas.
  if (session.rol === "tecnico") {
    const tecnico = await findTecnicoDetalleParaLogin(session.usuario_id);
    if (!tecnico) {
      await redis.del(`session:${token}`);
      return c.json({ error: "Sesion invalida" }, 401);
    }

    if (tecnico.estado_corte === "baja" || tecnico.estado_corte === "corte_aplicado") {
      await redis.del(`session:${token}`);
      return c.json(
        { error: "periodo_vencido", message: "Tu período de acceso ha concluido." },
        401
      );
    }

    const configCorte = await findConfiguracionByClave("fecha_corte_global");
    const fechaConfigurada = (configCorte?.valor as { fecha?: unknown } | null)?.fecha;
    const fechaCorteGlobal = typeof fechaConfigurada === "string" && fechaConfigurada.trim().length > 0
      ? fechaConfigurada
      : null;

    if (!fechaCorteGlobal) {
      await redis.del(`session:${token}`);
      return c.json(
        { error: "periodo_no_configurado", message: "No hay fecha de corte global configurada." },
        401
      );
    }

    if (new Date(fechaCorteGlobal) <= new Date()) {
      await marcarTecnicoVencido(session.usuario_id);
      await redis.del(`session:${token}`);
      return c.json(
        { error: "periodo_vencido", message: "Tu período de acceso ha concluido." },
        401
      );
    }
  }

  c.set("sessionToken", token);
  c.set("user", {
    sub: session.usuario_id,
    nombre: session.nombre,
    rol: session.rol,
    correo: session.correo,
  });

  return next();
});

function normalizeRole(role: string): string {
  return role === "admin" ? "administrador" : role;
}

export function requireRole(...roles: string[]) {
  return createMiddleware<Env>(async (c, next) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "No autenticado" }, 401);

    const expectedRoles = roles.map(normalizeRole);
    const userRole = normalizeRole(user.rol);

    if (!expectedRoles.includes(userRole)) return c.json({ error: "Sin permisos" }, 403);
    return next();
  });
}
