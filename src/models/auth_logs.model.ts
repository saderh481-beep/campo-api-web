import { sql } from "@/db";

export type AuthLogInput = {
  actor_id: string;
  actor_tipo: string;
  accion: string;
  ip?: string;
  user_agent?: string;
};

export async function createAuthLog(input: AuthLogInput) {
  const ipValue = input.ip ?? null;
  const userAgentValue = input.user_agent ?? null;
  const [row] = await sql`
    INSERT INTO auth_logs (actor_id, actor_tipo, accion, ip, user_agent)
    VALUES (${input.actor_id}, ${input.actor_tipo}, ${input.accion}, ${ipValue}, ${userAgentValue})
    RETURNING id, actor_id, actor_tipo, accion, ip, user_agent, created_at
  `;
  return row;
}

export async function listAuthLogsByActorId(actorId: string, limit = 50) {
  return await sql`
    SELECT id, actor_id, actor_tipo, accion, ip, user_agent, created_at
    FROM auth_logs
    WHERE actor_id = ${actorId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}
