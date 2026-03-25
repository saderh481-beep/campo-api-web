import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { postLogin, postLogout, postRequestCodigoAcceso } from "@/controllers/auth.controller";
import { rateLimitMiddleware } from "@/middleware/ratelimit";
import { authMiddleware } from "@/middleware/auth";
import type { AppEnv } from "@/types/http";

const app = new Hono<AppEnv>();

const requestCodigoSchema = z.object({ correo: z.string().email() });

const loginSchema = z.object({
  correo: z.string().email(),
  codigo_acceso: z.string().regex(/^\d{5,6}$/, "El codigo_acceso debe tener 5 o 6 digitos"),
});

app.post(
  "/request-codigo-acceso",
  rateLimitMiddleware(5, 60),
  zValidator("json", requestCodigoSchema),
  postRequestCodigoAcceso
);

app.post(
  "/verify-codigo-acceso",
  rateLimitMiddleware(10, 60),
  zValidator("json", loginSchema),
  (c) => postLogin(c, c.req.valid("json"))
);

app.post("/login", rateLimitMiddleware(10, 60), zValidator("json", loginSchema), (c) => postLogin(c, c.req.valid("json")));

// Compatibilidad temporal con clientes existentes
app.post("/request-otp", rateLimitMiddleware(5, 60), zValidator("json", requestCodigoSchema), postRequestCodigoAcceso);
app.post("/verify-otp", rateLimitMiddleware(10, 60), zValidator("json", loginSchema), (c) => postLogin(c, c.req.valid("json")));

app.post("/logout", authMiddleware, postLogout);

export default app;
