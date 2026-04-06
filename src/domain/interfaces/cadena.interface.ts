import type { Cadena, CadenaInput, CadenaUpdateInput } from "@/domain/entities/cadena.entity";

export interface ICadenaRepository {
  findAll(): Promise<Cadena[]>;
  create(input: CadenaInput, userId: string): Promise<Cadena>;
  update(id: string, input: CadenaUpdateInput): Promise<Cadena | null>;
  deactivate(id: string): Promise<{ id: string } | null>;
}
