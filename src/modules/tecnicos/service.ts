import { redis } from "@/config/db";
import * as repo from "./repository";
import { NotFoundError } from "@/lib/errors";

function generarCodigo5d(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function ttlHastaFecha(fechaLimite: string): number {
  const diff = new Date(fechaLimite).getTime() - Date.now();
  return Math.max(Math.floor(diff / 1000), 1);
}

export async function listar(params: Parameters<typeof repo.findAll>[0]) {
  return repo.findAll(params);
}

export async function obtener(id: string) {
  const tecnico = await repo.findById(id);
  if (!tecnico) throw new NotFoundError("Técnico");
  return tecnico;
}

export async function crear(data: {
  nombre: string; coordinadorId: string; fechaLimite: string;
}) {
  const codigoAcceso = generarCodigo5d();
  const tecnico      = await repo.create({ ...data, codigoAcceso });

  // Guardar código en Redis con TTL = fecha_limite
  const ttl = ttlHastaFecha(data.fechaLimite);
  await redis.setex(`tecnico:codigo:${tecnico.id}`, ttl, codigoAcceso);

  return tecnico;
}

export async function actualizar(
  id: string,
  data: Partial<{ nombre: string; fechaLimite: string; activo: boolean }>
) {
  const tecnico = await repo.update(id, data);
  if (!tecnico) throw new NotFoundError("Técnico");
  return tecnico;
}

export async function regenerarCodigo(id: string) {
  const tecnico = await repo.findById(id);
  if (!tecnico) throw new NotFoundError("Técnico");

  const codigoAcceso = generarCodigo5d();
  const updated      = await repo.update(id, { codigoAcceso });

  // Reemplazar código en Redis — invalida el anterior instantáneamente
  const ttl = ttlHastaFecha(tecnico.fechaLimite.toISOString());
  await redis.setex(`tecnico:codigo:${id}`, ttl, codigoAcceso);

  return { ...updated, codigoAcceso };
}

export async function desactivar(id: string) {
  const tecnico = await repo.update(id, { activo: false });
  if (!tecnico) throw new NotFoundError("Técnico");
  // Revocar código en Redis inmediatamente
  await redis.del(`tecnico:codigo:${id}`);
  return tecnico;
}
