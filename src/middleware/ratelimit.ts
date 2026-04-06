import { redis } from "@/lib/redis";
import type { Context, Next } from "hono";

export async function rateLimit(
  c: Context,
  next: Next,
  max = 20,
  windowSecs = 60
) {
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? c.req.header("x-real-ip") ?? "unknown";
  const route = new URL(c.req.url).pathname;
  const key = `rl:${ip}:${route}`;

  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSecs);

  if (count > max) {
    console.warn(`[RateLimit] IP: ${ip} excedió límite en ${route}`);
    return c.json({ error: "Demasiadas solicitudes, intenta más tarde" }, 429);
  }
  return next();
}

export function rateLimitMiddleware(max = 20, windowSecs = 60) {
  return (c: Context, next: Next) => rateLimit(c, next, max, windowSecs);
}
