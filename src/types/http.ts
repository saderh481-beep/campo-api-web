import type { JwtPayload } from "@/lib/jwt";

export type AppVariables = {
  user: JwtPayload;
  sessionToken: string;
};

export type SessionPayload = {
  usuario_id: string;
  rol: JwtPayload["rol"];
  nombre: string;
  correo: string;
  created_at: string;
  fecha_limite?: string;
};

export type AppEnv = {
  Variables: AppVariables;
};
