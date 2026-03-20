import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { hash, compare } from "bcryptjs";
import { sql } from "@/db";
import { redis } from "@/lib/redis";
import { signJwt } from "@/lib/jwt";
import { enviarCodigoAcceso } from "@/lib/mailer";
import { rateLimitMiddleware } from "@/middleware/ratelimit";
import { authMiddleware } from "@/middleware/auth";

const app = new Hono();

const CODIGO_ACCESO_TTL = 600;
const MAX_ATTEMPTS = 3;
const BLOCK_TTL = 1800;

function generarCodigoAcceso(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const requestCodigoSchema = z.object({ correo: z.string().email() });
const verifyCodigoSchema = z.object({
  correo: z.string().email(),
  codigo_acceso: z.string().length(6).optional(),
  otp: z.string().length(6).optional(),
}).refine((data) => Boolean(data.codigo_acceso ?? data.otp), {
  message: "Debes enviar codigo_acceso",
  path: ["codigo_acceso"],
});

async function requestCodigoAcceso(c: any) {
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

  const codigoAcceso = generarCodigoAcceso();
  const hashed = await hash(codigoAcceso, 10);

  await redis.setex(`codigo_acceso:${correo}`, CODIGO_ACCESO_TTL, hashed);
  await redis.del(`otp:${correo}`);
  await redis.del(`fail:${correo}`);

  try {
    await enviarCodigoAcceso(correo, codigoAcceso);
  } catch (err) {
    console.error("[codigo_acceso] Error al enviar correo:", err);
  }

  return c.json({ message: "Si el correo existe, recibirás un código" });
}

async function verifyCodigoAcceso(c: any) {
  const { correo, codigo_acceso, otp } = c.req.valid("json");
  const codigo = codigo_acceso ?? otp;

  if (!codigo) {
    return c.json({ error: "codigo_acceso es requerido" }, 400);
  }

  const bloqueado = await redis.get(`block:${correo}`);
  if (bloqueado) {
    return c.json({ error: "Cuenta bloqueada temporalmente. Intenta en 30 minutos" }, 429);
  }

  const stored = (await redis.get(`codigo_acceso:${correo}`)) ?? (await redis.get(`otp:${correo}`));
  if (!stored) {
    return c.json({ error: "Código inválido o expirado" }, 401);
  }

  const valido = await compare(codigo, stored);
  if (!valido) {
    const intentos = await redis.incr(`fail:${correo}`);
    if (intentos === 1) await redis.expire(`fail:${correo}`, CODIGO_ACCESO_TTL);
    if (intentos >= MAX_ATTEMPTS) {
      await redis.setex(`block:${correo}`, BLOCK_TTL, "1");
      await redis.del(`codigo_acceso:${correo}`);
      await redis.del(`otp:${correo}`);
      return c.json({ error: "Demasiados intentos. Cuenta bloqueada 30 minutos" }, 429);
    }
    return c.json({ error: "Código incorrecto" }, 401);
  }

  const [usuario] = await sql`
    SELECT id, nombre, rol FROM usuarios WHERE correo = ${correo} AND activo = true
  `;
  if (!usuario) return c.json({ error: "Usuario no encontrado" }, 401);

  await redis.del(`codigo_acceso:${correo}`);
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

app.post(
  "/request-codigo-acceso",
  rateLimitMiddleware(5, 60),
  zValidator("json", requestCodigoSchema),
  requestCodigoAcceso
);

app.post(
  "/verify-codigo-acceso",
  rateLimitMiddleware(10, 60),
  zValidator("json", verifyCodigoSchema),
  verifyCodigoAcceso
);

// Compatibilidad temporal con clientes existentes
app.post("/request-otp", rateLimitMiddleware(5, 60), zValidator("json", requestCodigoSchema), requestCodigoAcceso);
app.post("/verify-otp", rateLimitMiddleware(10, 60), zValidator("json", verifyCodigoSchema), verifyCodigoAcceso);

app.post("/logout", authMiddleware, async (c) => {
  return c.json(
    { message: "Sesión cerrada" },
    200,
    { "Set-Cookie": "session=; HttpOnly; Path=/; Max-Age=0" }
  );
});

export default app;
