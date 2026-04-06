import type { Zona, ZonaCreate, ZonaUpdate } from "@/domain/entities/zona.entity";

export interface IZonaRepository {
  findAll(): Promise<Zona[]>;
  findById(id: string): Promise<Zona | null>;
  create(data: ZonaCreate & { created_by: string }): Promise<Zona>;
  update(id: string, data: ZonaUpdate): Promise<Zona | null>;
  deactivate(id: string): Promise<Zona | null>;
}
