import { sql } from "@/infrastructure/db";
import type { Cadena, CadenaInput, CadenaUpdateInput } from "@/domain/entities/cadena.entity";
import type { ICadenaRepository } from "@/domain/interfaces/cadena.interface";

export class CadenaRepository implements ICadenaRepository {
  async findAll(): Promise<Cadena[]> {
    const rows = await sql`
      SELECT id, nombre, descripcion, activo, created_by, created_at, updated_at
      FROM cadenas_productivas
      WHERE activo = true
      ORDER BY nombre
    `;
    return rows as unknown as Cadena[];
  }

  async create(input: CadenaInput, userId: string): Promise<Cadena> {
    const descripcionValue = input.descripcion ?? null;
    const [row] = await sql`
      INSERT INTO cadenas_productivas (nombre, descripcion, created_by)
      VALUES (${input.nombre}, ${descripcionValue}, ${userId})
      RETURNING id, nombre, descripcion, activo, created_by, created_at, updated_at
    `;
    return row as unknown as Cadena;
  }

  async update(id: string, input: CadenaUpdateInput): Promise<Cadena | null> {
    const [row] = await sql`
      UPDATE cadenas_productivas SET
        nombre = COALESCE(${input.nombre ?? null}, nombre),
        descripcion = COALESCE(${input.descripcion ?? null}, descripcion),
        updated_at = NOW()
      WHERE id = ${id} AND activo = true
      RETURNING id, nombre, descripcion, activo, created_by, created_at, updated_at
    `;
    return (row as unknown as Cadena) ?? null;
  }

  async deactivate(id: string): Promise<{ id: string } | null> {
    const [row] = await sql`
      UPDATE cadenas_productivas SET activo = false, updated_at = NOW()
      WHERE id = ${id} AND activo = true
      RETURNING id
    `;
    return (row as unknown as { id: string }) ?? null;
  }
}
