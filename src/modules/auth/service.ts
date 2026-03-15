import { hash, compare } from "bcryptjs";
import { Resend } from "resend";
import { sql } from "@/config/db";
import { redis } from "@/config/db";
import { signToken } from "@/lib/jwt";
import { AppError, UnauthorizedError } from "@/lib/errors";
import { env } from "@/config/env";

const resend = new Resend(env.RESEND_API_KEY);

const OTP_TTL        = 600;   // 10 minutos
const BLOQUEO_TTL    = 1800;  // 30 minutos
const MAX_INTENTOS   = 3;

function otpKey(correo: string)      { return `otp:web:${correo}`; }
function intentosKey(correo: string) { return `intentos:web:${correo}`; }
function bloqueoKey(correo: string)  { return `bloqueo:web:${correo}`; }
function genOTP()                    { return Math.floor(100000 + Math.random() * 900000).toString(); }

export async function solicitarOtp(correo: string): Promise<void> {
  const [usuario] = await sql`
    SELECT id, nombre FROM usuarios
    WHERE correo = ${correo} AND activo = true LIMIT 1
  `;
  // Respuesta genérica — no revelar si existe
  if (!usuario) return;

  if (await redis.get(bloqueoKey(correo))) return;

  const otp  = genOTP();
  const hash_ = await hash(otp, 10);
  await redis.setex(otpKey(correo), OTP_TTL, hash_);

  await resend.emails.send({
    from: env.EMAIL_FROM,
    to:   correo,
    subject: "Tu código de acceso — SaaS Campo",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#1a5e3a">Código de acceso</h2>
        <p>Hola <strong>${usuario.nombre}</strong>,</p>
        <p>Tu código temporal es:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;
                    background:#f4f4f4;padding:20px;text-align:center;
                    border-radius:8px;margin:20px 0">${otp}</div>
        <p style="color:#666;font-size:14px">Válido por <strong>10 minutos</strong>.</p>
      </div>`,
  });
}

export async function login(
  correo: string,
  otp: string,
  ip: string,
  userAgent: string
) {
  const bKey = bloqueoKey(correo);
  const iKey = intentosKey(correo);
  const oKey = otpKey(correo);

  if (await redis.get(bKey)) {
    const ttl = await redis.ttl(bKey);
    throw new AppError(`Cuenta bloqueada. Intenta en ${Math.ceil(ttl / 60)} minutos`, 429);
  }

  const storedHash = await redis.get(oKey);
  if (!storedHash) throw new AppError("Código expirado o no solicitado", 400);

  const valido = await compare(otp, storedHash);
  if (!valido) {
    const intentos = await redis.incr(iKey);
    await redis.expire(iKey, OTP_TTL);
    if (intentos >= MAX_INTENTOS) {
      await redis.setex(bKey, BLOQUEO_TTL, "1");
      await redis.del(oKey, iKey);
      throw new AppError("Demasiados intentos. Bloqueado 30 minutos", 429);
    }
    throw new AppError(`Código incorrecto. Intentos restantes: ${MAX_INTENTOS - intentos}`, 400);
  }

  await redis.del(oKey, iKey, bKey);

  const [usuario] = await sql`
    SELECT id, nombre, correo, rol, coordinador_id
    FROM usuarios WHERE correo = ${correo} AND activo = true
  `;
  if (!usuario) throw new UnauthorizedError();

  await sql`
    INSERT INTO auth_logs (usuario_id, tipo, ip, user_agent)
    VALUES (${usuario.id}, 'login_web', ${ip}, ${userAgent})
  `;

  const token = await signToken({
    sub: usuario.id,
    rol: usuario.rol,
    ...(usuario.coordinadorId ? { coordinadorId: usuario.coordinadorId } : {}),
  });

  return { token, usuario };
}

export async function me(usuarioId: string) {
  const [usuario] = await sql`
    SELECT id, nombre, correo, rol FROM usuarios
    WHERE id = ${usuarioId} AND activo = true
  `;
  return usuario ?? null;
}
