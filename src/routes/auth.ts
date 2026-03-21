import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { compare } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { sql } from "@/db";
import { redis } from "@/lib/redis";
import { rateLimitMiddleware } from "@/middleware/ratelimit";
import { authMiddleware } from "@/middleware/auth";

const app = new Hono();

const SESSION_TTL_SECONDS = 86400;

const requestCodigoSchema = z.object({ correo: z.string().email() });

const loginSchema = z.object({
  correo: z.string().email(),
  codigo_acceso: z.string().regex(/^\d{5,6}$/, "El codigo_acceso debe tener 5 o 6 digitos"),
});

async function requestCodigoAcceso(c: any) {
  c.req.valid("json");
  return c.json({
    message: "Este endpoint ya no genera codigos. Usa el codigo_acceso asignado al usuario.",
  });
}

async function login(c: any) {
  const { correo, codigo_acceso } = c.req.valid("json");

  const [usuario] = await sql`
    SELECT id, nombre, correo, rol, hash_codigo_acceso
    FROM usuarios
    WHERE correo = ${correo} AND activo = true
  `;
  if (!usuario?.hash_codigo_acceso) {
    return c.json({ error: "Credenciales invalidas" }, 401);
  }

  const valido = await compare(codigo_acceso, usuario.hash_codigo_acceso);
  if (!valido) {
    return c.json({ error: "Credenciales invalidas" }, 401);
  }

  const token = randomUUID();
  const createdAt = new Date().toISOString();
  const sessionPayload = {
    usuario_id: usuario.id,
    rol: usuario.rol,
    nombre: usuario.nombre,
    correo: usuario.correo,
    created_at: createdAt,
  };

  await redis.setex(`session:${token}`, SESSION_TTL_SECONDS, JSON.stringify(sessionPayload));

  const ip = (c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown").split(",")[0].trim();
  const userAgent = c.req.header("user-agent") ?? null;

  await sql`
    INSERT INTO auth_logs (actor_id, actor_tipo, accion, ip, user_agent)
    VALUES (${usuario.id}, 'usuario', 'login', ${ip}, ${userAgent})
  `;

  return c.json({
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    },
  });
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
  zValidator("json", loginSchema),
  login
);

app.post("/login", rateLimitMiddleware(10, 60), zValidator("json", loginSchema), login);

// Compatibilidad temporal con clientes existentes
app.post("/request-otp", rateLimitMiddleware(5, 60), zValidator("json", requestCodigoSchema), requestCodigoAcceso);
app.post("/verify-otp", rateLimitMiddleware(10, 60), zValidator("json", loginSchema), login);

app.post("/logout", authMiddleware, async (c) => {
  const token = c.get("sessionToken") as string | undefined;
  const user = c.get("user");

  if (token) {
    await redis.del(`session:${token}`);
  }

  if (user?.sub) {
    const ip = (c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown")
      .split(",")[0]
      .trim();
    const userAgent = c.req.header("user-agent") ?? null;

    await sql`
      INSERT INTO auth_logs (actor_id, actor_tipo, accion, ip, user_agent)
      VALUES (${user.sub}, 'usuario', 'logout', ${ip}, ${userAgent})
    `;
  }

  return c.json({ message: "Sesion cerrada" });
});

export default app;
