import { randomUUID } from "node:crypto";
import { redis } from "@/infrastructure/lib/redis";
import { hashSHA512 } from "@/infrastructure/lib/crypto-utils";
import {
  createAuthLog,
  findUsuarioParaLogin,
} from "@/data/models/auth.model";
import type { SessionPayload } from "@/types/http";

const SESSION_TTL_SECONDS = 86400;

type LoginInput = {
  correo: string;
  codigo_acceso: string;
};

type ClientMetadata = {
  ip: string;
  userAgent: string | null;
};

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

  const token = randomUUID();
  const createdAt = new Date().toISOString();
  const sessionPayload: SessionPayload = {
    usuario_id: usuario.id,
    rol: usuario.rol,
    nombre: usuario.nombre,
    correo: usuario.correo,
    created_at: createdAt,
  };

  await redis.setex(`session:${token}`, SESSION_TTL_SECONDS, JSON.stringify(sessionPayload));
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