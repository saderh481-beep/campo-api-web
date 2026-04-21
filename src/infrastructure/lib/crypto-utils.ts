import { createHash } from "node:crypto";

export function hashSHA512(input: string): string {
  return createHash("sha512").update(input).digest("hex");
}

export function normalizeRole(role: string): string {
  if (role === "administrador") return "admin";
  return role;
}