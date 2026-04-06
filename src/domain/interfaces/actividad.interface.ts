import type { Actividad, ActividadCreate, ActividadUpdate } from "@/domain/entities/actividad.entity";

export interface IActividadRepository {
  findAll(): Promise<Actividad[]>;
  create(data: ActividadCreate, userId: string): Promise<Actividad>;
  update(id: string, data: ActividadUpdate): Promise<Actividad | null>;
  deactivate(id: string): Promise<Actividad | null>;
}
