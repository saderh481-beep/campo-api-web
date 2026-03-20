import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { hash, compare } from "bcryptjs";
import { sql } from "@/db";
import { redis } from "@/lib/redis";
import { signJwt } from "@/lib/jwt";
import { enviarOtp } from "@/lib/mailer";
import { rateLimitMiddleware } from "@/middleware/ratelimit";
import { authMiddleware } from "@/middleware/auth";

const app = new Hono();

const OTP_TTL = 600;
const MAX_ATTEMPTS = 3;
const BLOCK_TTL = 1800;

function generarOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post(
  "/request-otp",
  rateLimitMiddleware(5, 60),
  zValidator("json", z.object({ correo: z.string().email() })),
  async (c) => {
    const { correo } = c.req.valid("json");

    const bloqueado = await redis.get(`block:${correo}`);
    if (bloqueado) {
      return c.json({ message: "Si el correo existe, recibirás un código" });
    }

    const [usuario] = await sql`
      SELECT id FROM usuarios WHERE correo = ${correo} AND activo = true
    `;
    if (!usuario) {
      return c.json({ message: "Si el correo existe, recibirás un código" });
    }

    const otp = generarOtp();
    const hashed = await hash(otp, 10);

    await redis.setex(`otp:${correo}`, OTP_TTL, hashed);
    await redis.del(`fail:${correo}`);

    try {
      await enviarOtp(correo, otp);
    } catch (err) {
      console.error("[OTP] Error al enviar correo:", err);
    }

    return c.json({ message: "Si el correo existe, recibirás un código" });
  }
);

app.post(
  "/verify-otp",
  rateLimitMiddleware(10, 60),
  zValidator("json", z.object({ correo: z.string().email(), otp: z.string().length(6) })),
  async (c) => {
    const { correo, otp } = c.req.valid("json");

    const bloqueado = await redis.get(`block:${correo}`);
    if (bloqueado) {
      return c.json({ error: "Cuenta bloqueada temporalmente. Intenta en 30 minutos" }, 429);
    }

    const stored = await redis.get(`otp:${correo}`);
    if (!stored) {
      return c.json({ error: "Código inválido o expirado" }, 401);
    }

    const valido = await compare(otp, stored);
    if (!valido) {
      const intentos = await redis.incr(`fail:${correo}`);
      if (intentos === 1) await redis.expire(`fail:${correo}`, OTP_TTL);
      if (intentos >= MAX_ATTEMPTS) {
        await redis.setex(`block:${correo}`, BLOCK_TTL, "1");
        await redis.del(`otp:${correo}`);
        return c.json({ error: "Demasiados intentos. Cuenta bloqueada 30 minutos" }, 429);
      }
      return c.json({ error: "Código incorrecto" }, 401);
    }

    const [usuario] = await sql`
      SELECT id, nombre, rol FROM usuarios WHERE correo = ${correo} AND activo = true
    `;
    if (!usuario) return c.json({ error: "Usuario no encontrado" }, 401);

    await redis.del(`otp:${correo}`);
    await redis.del(`fail:${correo}`);

    const token = await signJwt({ sub: usuario.id, rol: usuario.rol, nombre: usuario.nombre });

    await sql`
      INSERT INTO auth_logs (usuario_id, evento, ip)
      VALUES (${usuario.id}, 'login', ${c.req.header("x-forwarded-for") ?? "unknown"})
    `;

    return c.json(
      { message: "Autenticado correctamente", usuario: { nombre: usuario.nombre, rol: usuario.rol } },
      200,
      {
        "Set-Cookie": `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
      }
    );
  }
);

app.post("/logout", authMiddleware, async (c) => {
  return c.json(
    { message: "Sesión cerrada" },
    200,
    { "Set-Cookie": "session=; HttpOnly; Path=/; Max-Age=0" }
  );
});

export default app;
