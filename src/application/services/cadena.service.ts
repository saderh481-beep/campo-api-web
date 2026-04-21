import type { Cadena, CadenaInput, CadenaUpdateInput } from "@/domain/entities/cadena.entity";
import type { ICadenaRepository } from "@/domain/interfaces/cadena.interface";

export type SuccessResponse<T> = { success: true; data: T; status: number };
export type ErrorResponse = { success: false; error: string; status: number };

export class CadenaService {
  constructor(private readonly repository: ICadenaRepository) {}

  async listarCadenas(): Promise<Cadena[]> {
    return this.repository.findAll();
  }

  async crearCadena(input: CadenaInput, userId: string): Promise<SuccessResponse<Cadena>> {
    const data = await this.repository.create(input, userId);
    return { success: true, data, status: 201 };
  }

  async editarCadena(id: string, input: CadenaUpdateInput): Promise<SuccessResponse<Cadena> | ErrorResponse> {
    const row = await this.repository.update(id, input);
    if (!row) {
      return { success: false, error: "Cadena no encontrada", status: 404 };
    }
    return { success: true, data: row, status: 200 };
  }

  async eliminarCadena(id: string): Promise<SuccessResponse<{ message: string }> | ErrorResponse> {
    const row = await this.repository.deactivate(id);
    if (!row) {
      return { success: false, error: "Cadena no encontrada", status: 404 };
    }
    return { success: true, data: { message: "Cadena desactivada" }, status: 200 };
  }
}
