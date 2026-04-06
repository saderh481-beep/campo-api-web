import { randomUUID, createHash } from "node:crypto";
import { redis } from "@/lib/redis";
import {
  createAuthLog,
  findTecnicoDetalleParaLogin,
  findUsuarioParaLogin,
  marcarTecnicoVencido,
} from "@/models/auth.model";
import { findConfiguracionByClave } from "@/models/configuraciones.model";
import type { SessionPayload } from "@/types/http";

const SESSION_TTL_SECONDS = 86400;

interface SessionCache {
  usuario_id: string;
  nombre: string;
  correo: string;
  rol: string;
  created_at: string;
  fecha_limite?: string;
  login_at: string;
  ip?: string;
  user_agent?: string;
}

type LoginInput = {
  correo: string;
  codigo_acceso: string;
};

type ClientMetadata = {
  ip: string;
  userAgent: string | null;
};

function hashSHA512(input: string): string {
  return createHash("sha512").update(input).digest("hex");
}

export async function solicitarCodigoAcceso() {
  return {
    message: "Este endpoint ya no genera codigos. Usa el codigo_acceso asignado al usuario.",
  };
}

export async function iniciarSesion(input: LoginInput, client: ClientMetadata) {
  const usuario = await findUsuarioParaLogin(input.correo);
  if (!usuario?.hash_codigo_acceso) {
    return { status: 401 as const, body: { error: "Credenciales invalidas" } };
  }

  const hashIngresado = hashSHA512(input.codigo_acceso);
  const valido = hashIngresado === usuario.hash_codigo_acceso;
  if (!valido) {
    return { status: 401 as const, body: { error: "Credenciales invalidas" } };
  }

  let fechaCorteGlobal: string | null = null;
  if (usuario.rol === "tecnico") {
    const tecnico = await findTecnicoDetalleParaLogin(usuario.id);
    if (!tecnico) return { status: 401 as const, body: { error: "Credenciales invalidas" } };

    const configCorte = await findConfiguracionByClave("fecha_corte_global");
    const fechaConfigurada = (configCorte?.valor as { fecha?: unknown } | null)?.fecha;
    fechaCorteGlobal = typeof fechaConfigurada === "string" && fechaConfigurada.trim().length > 0
      ? fechaConfigurada
      : null;

    const vencido =
      tecnico.estado_corte === "corte_aplicado" ||
      (fechaCorteGlobal && new Date(fechaCorteGlobal) <= new Date());

    if (vencido) {
      if (tecnico.estado_corte !== "corte_aplicado") {
        await marcarTecnicoVencido(usuario.id);
      }

      return {
        status: 401 as const,
        body: {
          error: "periodo_vencido",
          message: "Tu período de acceso ha concluido. Contacta a tu coordinador.",
        },
      };
    }

    if (!fechaCorteGlobal) {
      return {
        status: 401 as const,
        body: {
          error: "periodo_no_configurado",
          message: "No hay fecha de corte global configurada.",
        },
      };
    }
  }

  const token = randomUUID();
  const createdAt = new Date().toISOString();
  const sessionCache: SessionCache = {
    usuario_id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    created_at: createdAt,
    login_at: createdAt,
    ip: client.ip,
    user_agent: client.userAgent ?? undefined,
    ...(fechaCorteGlobal ? { fecha_limite: fechaCorteGlobal } : {}),
  };

  await redis.setex(`session:${token}`, SESSION_TTL_SECONDS, JSON.stringify(sessionCache));
  await createAuthLog(usuario.id, "login", client.ip, client.userAgent);

  return {
    status: 200 as const,
    body: {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    },
  };
}

export async function cerrarSesion(token: string | undefined, userId: string | undefined, client: ClientMetadata) {
  if (token) {
    await redis.del(`session:${token}`);
  }

  if (userId) {
    await createAuthLog(userId, "logout", client.ip, client.userAgent);
  }

  return { message: "Sesion cerrada" };
}