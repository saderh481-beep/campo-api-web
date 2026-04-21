import { redis } from "@/infrastructure/lib/redis";
import type { Context, Next } from "hono";

const getConfig = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

export interface RateLimitConfig {
  max: number;
  windowSecs: number;
}

const defaultConfig: RateLimitConfig = {
  max: getConfig("RATE_LIMIT_MAX", 20),
  windowSecs: getConfig("RATE_LIMIT_WINDOW", 60),
};

export async function rateLimit(
  c: Context,
  next: Next,
  max = defaultConfig.max,
  windowSecs = defaultConfig.windowSecs
) {
  try {
    const ip = c.req.header("cf-connecting-ip") 
      ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() 
      ?? c.req.header("x-real-ip") 
      ?? "unknown";
    const route = new URL(c.req.url).pathname;
    const key = `rl:${ip}:${route}`;

    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSecs);

    if (count > max) {
      console.warn(`[RateLimit] IP: ${ip} excedió límite en ${route}`, { max });
      return c.json({ error: "Demasiadas solicitudes, intenta más tarde", code: "RATE_LIMIT_EXCEEDED" }, 429);
    }
  } catch (e) {
    console.warn("[RateLimit] Redis no disponible, saltando limitación");
  }
  return next();
}

export function rateLimitMiddleware(max = 20, windowSecs = 60) {
  return (c: Context, next: Next) => rateLimit(c, next, max, windowSecs);
}