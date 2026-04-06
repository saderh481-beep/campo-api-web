import type { Actividad, ActividadCreate, ActividadUpdate } from "@/domain/entities/actividad.entity";
import type { IActividadRepository } from "@/domain/interfaces/actividad.interface";

export interface ServiceResult<T> {
  status: number;
  body: T;
}

export class ActividadService {
  constructor(private readonly repository: IActividadRepository) {}

  async listarActividades(): Promise<Actividad[]> {
    return this.repository.findAll();
  }

  async crearActividad(input: ActividadCreate, userId: string): Promise<Actividad> {
    return this.repository.create(input, userId);
  }

  async editarActividad(id: string, input: ActividadUpdate): Promise<ServiceResult<Actividad | { error: string }>> {
    const row = await this.repository.update(id, input);
    if (!row) return { status: 404, body: { error: "Actividad no encontrada" } };
    return { status: 200, body: row };
  }

  async eliminarActividad(id: string): Promise<ServiceResult<{ message: string } | { error: string }>> {
    const row = await this.repository.deactivate(id);
    if (!row) return { status: 404, body: { error: "Actividad no encontrada" } };
    return { status: 200, body: { message: "Actividad desactivada" } };
  }
}
