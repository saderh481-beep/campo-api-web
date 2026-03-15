import { SignJWT, jwtVerify } from "jose";
import { env } from "@/config/env";
import type { JWTPayload } from "@/types";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export async function signToken(
  payload: Omit<JWTPayload, "iat" | "exp">,
  expiresIn = "8h"
): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as JWTPayload;
}
