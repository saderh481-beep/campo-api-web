import { sql } from "@/db";
import type { Actividad, ActividadCreate, ActividadUpdate } from "@/domain/entities/actividad.entity";
import type { IActividadRepository } from "@/domain/interfaces/actividad.interface";

export class ActividadRepository implements IActividadRepository {
  async findAll(): Promise<Actividad[]> {
    const rows = await sql`
      SELECT id, nombre, descripcion, activo, created_by, created_at, updated_at
      FROM actividades
      WHERE activo = true
      ORDER BY nombre
    `;
    return rows as unknown as Actividad[];
  }

  async create(data: ActividadCreate, userId: string): Promise<Actividad> {
    const [row] = await sql`
      INSERT INTO actividades (nombre, descripcion, created_by)
      VALUES (${data.nombre}, ${data.descripcion ?? null}, ${userId})
      RETURNING id, nombre, descripcion, activo, created_by, created_at, updated_at
    `;
    return row as unknown as Actividad;
  }

  async update(id: string, data: ActividadUpdate): Promise<Actividad | null> {
    const [row] = await sql`
      UPDATE actividades SET
        nombre = COALESCE(${data.nombre ?? null}, nombre),
        descripcion = COALESCE(${data.descripcion ?? null}, descripcion),
        updated_at = NOW()
      WHERE id = ${id} AND activo = true
      RETURNING id, nombre, descripcion, activo, created_by, created_at, updated_at
    `;
    return (row as unknown as Actividad) ?? null;
  }

  async deactivate(id: string): Promise<Actividad | null> {
    const [row] = await sql`
      UPDATE actividades SET activo = false, updated_at = NOW()
      WHERE id = ${id} AND activo = true
      RETURNING id, nombre, descripcion, activo, created_by, created_at, updated_at
    `;
    return (row as unknown as Actividad) ?? null;
  }
}
