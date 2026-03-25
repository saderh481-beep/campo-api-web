import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import { confirmarArchivado, forzarArchivado, listarArchivos, obtenerDescargaArchivado } from "@/services/archive.service";

export async function getArchiveLogs(c: Context<AppEnv>) {
  const rows = await listarArchivos();
  return c.json(rows);
}

export async function getArchiveDownload(c: Context<AppEnv>) {
  const { periodo } = c.req.param();
  const result = await obtenerDescargaArchivado(periodo);
  if (result.status !== 200) return c.json(result.body, result.status);

  return new Response(result.body, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="archivo-${periodo}.tar.gz.enc"`,
    },
  });
}

export async function postArchiveConfirm(c: Context<AppEnv>) {
  const { periodo } = c.req.param();
  const user = c.get("user");
  const result = await confirmarArchivado(periodo, user.sub);
  return c.json(result.body, result.status);
}

export async function postArchiveForce(c: Context<AppEnv>) {
  const { periodo } = c.req.param();
  const result = await forzarArchivado(periodo);
  return c.json(result.body, result.status);
}