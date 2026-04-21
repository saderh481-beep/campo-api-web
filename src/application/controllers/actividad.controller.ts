import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import type { ActividadService } from "@/application/services/actividad.service";
import type { ActividadCreate, ActividadUpdate } from "@/domain/entities/actividad.entity";

export class ActividadController {
  constructor(private readonly service: ActividadService) {}

  async getActividades(c: Context<AppEnv>) {
    const rows = await this.service.listarActividades();
    return c.json(rows);
  }

  async postActividad(c: Context<AppEnv>, body: ActividadCreate) {
    const user = c.get("user");
    const row = await this.service.crearActividad(body, user.sub);
    return c.json(row, 201);
  }

  async patchActividad(c: Context<AppEnv>, body: ActividadUpdate) {
    const { id } = c.req.param();
    const result = await this.service.editarActividad(id, body);
    return c.json(result.body, result.status as 200 | 404);
  }

  async deleteActividad(c: Context<AppEnv>) {
    const { id } = c.req.param();
    const result = await this.service.eliminarActividad(id);
    return c.json(result.body, result.status as 200 | 404);
  }
}
