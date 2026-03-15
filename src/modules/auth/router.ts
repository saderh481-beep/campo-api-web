import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { setCookie, deleteCookie } from "hono/cookie";
import { env } from "@/config/env";
import { requireAuth } from "@/middleware/auth";
import { NotFoundError } from "@/lib/errors";
import * as service from "./service";
import { solicitarOtpSchema, loginSchema } from "./schema";

const router = new Hono();

// POST /auth/otp
router.post("/otp", zValidator("json", solicitarOtpSchema), async (c) => {
  const { correo } = c.req.valid("json");
  await service.solicitarOtp(correo);
  return c.json({ ok: true, message: "Si el correo existe, recibirás el código" });
});

// POST /auth/login
router.post("/login", zValidator("json", loginSchema), async (c) => {
  const { correo, otp } = c.req.valid("json");
  const ip        = c.req.header("x-forwarded-for") ?? "unknown";
  const userAgent = c.req.header("user-agent") ?? "unknown";

  const { token, usuario } = await service.login(correo, otp, ip, userAgent);

  setCookie(c, "session", token, {
    httpOnly: true,
    secure:   env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge:   60 * 60 * 8,
    path:     "/",
  });

  return c.json({ ok: true, usuario });
});

// POST /auth/logout
router.post("/logout", requireAuth, (c) => {
  deleteCookie(c, "session", { path: "/" });
  return c.json({ ok: true });
});

// GET /auth/me
router.get("/me", requireAuth, async (c) => {
  const { sub } = c.get("jwtPayload");
  const usuario = await service.me(sub);
  if (!usuario) throw new NotFoundError("Usuario");
  return c.json({ usuario });
});

export default router;
