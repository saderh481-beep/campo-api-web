import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import type { CadenaInput, CadenaUpdateInput } from "@/domain/entities/cadena.entity";
import type { CadenaService } from "@/services/cadena.service";

export class CadenaController {
  constructor(private readonly service: CadenaService) {}

  async getCadenas(c: Context<AppEnv>) {
    const rows = await this.service.listarCadenas();
    return c.json(rows);
  }

  async postCadena(c: Context<AppEnv>, body: CadenaInput) {
    const user = c.get("user");
    const result = await this.service.crearCadena(body, user.sub);
    return c.json(result.data, result.status as 201);
  }

  async patchCadena(c: Context<AppEnv>, body: CadenaUpdateInput) {
    const { id } = c.req.param();
    const result = await this.service.editarCadena(id, body);
    if (!result.success) {
      return c.json({ error: result.error }, 404);
    }
    return c.json(result.data, 200);
  }

  async deleteCadena(c: Context<AppEnv>) {
    const { id } = c.req.param();
    const result = await this.service.eliminarCadena(id);
    if (!result.success) {
      return c.json({ error: result.error }, 404);
    }
    return c.json(result.data, 200);
  }
}
