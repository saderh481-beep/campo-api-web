import { createMiddleware } from "hono/factory";
import { redis } from "@/lib/redis";
import { verifyJwt } from "@/lib/jwt";
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

  let session: SessionPayload | null = null;
  let useJwtFallback = false;

  try {
    const rawSession = await redis.get(`session:${token}`);
    if (rawSession) {
      session = JSON.parse(rawSession) as SessionPayload;
    } else {
      useJwtFallback = true;
    }
  } catch (e) {
    console.warn("[Auth] Redis no disponible, usando JWT");
    useJwtFallback = true;
  }

  if (useJwtFallback) {
    try {
      const jwtPayload = await verifyJwt(token);
      if (!jwtPayload) return c.json({ error: "Token inválido o expirado" }, 401);
      session = {
        usuario_id: jwtPayload.sub,
        nombre: jwtPayload.nombre,
        correo: jwtPayload.correo ?? "",
        rol: jwtPayload.rol,
        created_at: new Date().toISOString(),
        login_at: new Date().toISOString(),
      };
    } catch (e) {
      console.error("[Auth] Error al verificar JWT:", e);
      return c.json({ error: "Token inválido o expirado" }, 401);
    }
  }

  if (!session) return c.json({ error: "Token inválido o expirado" }, 401);

  try {
    if (session.rol === "tecnico") {
      const tecnico = await findTecnicoDetalleParaLogin(session.usuario_id);
      if (!tecnico) {
        try { if (!useJwtFallback) await redis.del(`session:${token}`); } catch {}
        return c.json({ error: "Sesión inválida" }, 401);
      }

      if (tecnico.estado_corte === "baja" || tecnico.estado_corte === "suspendido") {
        try { if (!useJwtFallback) await redis.del(`session:${token}`); } catch {}
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
        try { if (!useJwtFallback) await redis.del(`session:${token}`); } catch {}
        return c.json(
          { error: "periodo_no_configurado", message: "No hay fecha de corte global configurada." },
          401
        );
      }

      if (new Date(fechaCorteGlobal) <= new Date()) {
        await marcarTecnicoVencido(session.usuario_id);
        try { if (!useJwtFallback) await redis.del(`session:${token}`); } catch {}
        return c.json(
          { error: "periodo_vencido", message: "Tu período de acceso ha concluido." },
          401
        );
      }
    }
  } catch (e) {
    console.error("[Auth] Error al verificar estado del técnico:", e);
    return c.json({ error: "Error al verificar permisos" }, 500);
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
  if (role === "administrador") return "admin";
  return role;
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
