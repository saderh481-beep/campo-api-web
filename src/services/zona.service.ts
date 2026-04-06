import type { Zona, ZonaCreate, ZonaUpdate } from "@/domain/entities/zona.entity";
import {
  findAllZonas,
  findZonaById,
  createZona,
  updateZona,
  deactivateZona,
} from "@/repositories/zona.repository";

export type ServiceResult<T = unknown> = {
  status: 200 | 201 | 404;
  body: T;
};

export class ZonaService {
  async listar(): Promise<Zona[]> {
    return findAllZonas();
  }

  async crear(input: ZonaCreate, userId: string): Promise<Zona> {
    return createZona({ ...input, created_by: userId });
  }

  async editar(id: string, input: ZonaUpdate): Promise<ServiceResult> {
    const zona = await findZonaById(id);
    if (!zona) {
      return { status: 404 as const, body: { error: "Zona no encontrada" } };
    }

    const actualizada = await updateZona(id, input);
    return { status: 200 as const, body: actualizada };
  }

  async eliminar(id: string): Promise<ServiceResult> {
    const zona = await findZonaById(id);
    if (!zona) {
      return { status: 404 as const, body: { error: "Zona no encontrada" } };
    }

    await deactivateZona(id);
    return { status: 200 as const, body: { message: "Zona desactivada" } };
  }
}
