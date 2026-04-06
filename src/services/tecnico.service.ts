import type { Tecnico, TecnicoUpdate } from "@/domain/entities/tecnico.entity";
import type { ICodigoAccesoService } from "@/domain/interfaces/usuario.interface";
import {
  findTecnicoById,
  findAllTecnicos,
  findTecnicosByCoordinadorId,
  existsCorreoEnUsuarioActivo,
  isCoordinadorActivo,
  updateTecnico,
  updateTecnicoCodigo,
  deactivateTecnico,
  listAsignacionesByTecnicoId,
} from "@/repositories/tecnico.repository";
import {
  findTecnicoDetalleByTecnicoId,
  updateTecnicoDetalle,
  applyCortesVencidos,
  cerrarCorteById,
} from "@/repositories/tecnico-detalle.repository";
import { enviarCodigoTecnico } from "@/lib/mailer";

export type ServiceResult<T = unknown> = {
  status: 200 | 201 | 400 | 403 | 404 | 409;
  body: T;
};

export class TecnicoService {
  constructor(private readonly codigoService: ICodigoAccesoService) {}

  async listar(userId: string, rol: string): Promise<Tecnico[]> {
    if (rol === "admin") {
      return findAllTecnicos();
    }
    return findTecnicosByCoordinadorId(userId);
  }

  async obtenerDetalle(id: string, userId: string, rol: string): Promise<ServiceResult> {
    const tecnico = await findTecnicoById(id);
    if (!tecnico) {
      return { status: 404, body: { error: "Técnico no encontrado" } };
    }

    if (rol === "coordinador" && tecnico.coordinador_id !== userId) {
      return { status: 403, body: { error: "Sin permisos" } };
    }

    const asignaciones = await listAsignacionesByTecnicoId(id);
    return { status: 200, body: { ...tecnico, asignaciones } };
  }

  async actualizar(id: string, body: TecnicoUpdate): Promise<ServiceResult> {
    const tecnico = await findTecnicoById(id);
    if (!tecnico) {
      return { status: 404, body: { error: "Técnico no encontrado" } };
    }

    if (body.correo) {
      const correoDuplicado = await existsCorreoEnUsuarioActivo(body.correo, tecnico.correo);
      if (correoDuplicado) {
        return { status: 409, body: { error: "El correo ya está registrado" } };
      }
    }

    if (body.coordinador_id) {
      const coordinadorActivo = await isCoordinadorActivo(body.coordinador_id);
      if (!coordinadorActivo) {
        return { status: 400, body: { error: "Coordinador inválido o inactivo" } };
      }
    }

    const actualizado = await updateTecnico(id, body);
    if (!actualizado) {
      return { status: 404, body: { error: "Técnico no encontrado" } };
    }

    if (body.coordinador_id || body.fecha_limite) {
      await updateTecnicoDetalle(id, {
        coordinador_id: body.coordinador_id,
        fecha_limite: body.fecha_limite ?? undefined,
      });
    }

    return { status: 200, body: actualizado };
  }

  async regenerarCodigo(id: string): Promise<ServiceResult> {
    const tecnico = await findTecnicoById(id);
    if (!tecnico) {
      return { status: 404, body: { error: "Técnico no encontrado" } };
    }

    const codigo = await this.codigoService.generar("tecnico");
    const hashCodigo = this.codigoService.hashear(codigo);
    await updateTecnicoCodigo(id, codigo, hashCodigo);

    if (tecnico.fecha_limite) {
      try {
        await enviarCodigoTecnico(tecnico.correo, tecnico.nombre, codigo, new Date(tecnico.fecha_limite));
      } catch (err) {
        console.error("[Código técnico] Error al enviar correo:", err);
      }
    }

    return { status: 200, body: { message: "Código generado y enviado", codigo } };
  }

  async aplicarCortes(): Promise<ServiceResult> {
    const tecnicos = await applyCortesVencidos();
    return {
      status: 200,
      body: { message: `Corte aplicado a ${tecnicos.length} técnico(s)`, tecnicos },
    };
  }

  async cerrarCorte(id: string, userId: string, rol: string): Promise<ServiceResult> {
    const tecnico = await findTecnicoById(id);
    if (!tecnico) {
      return { status: 404, body: { error: "Técnico no encontrado" } };
    }

    if (rol === "coordinador" && tecnico.coordinador_id !== userId) {
      return { status: 403, body: { error: "Sin permisos sobre este técnico" } };
    }

    const actualizado = await cerrarCorteById(id);
    if (!actualizado) {
      return { status: 404, body: { error: "Asignación de corte no encontrada" } };
    }

    return { status: 200, body: { message: "Período cerrado", tecnico: actualizado } };
  }

  async eliminar(id: string): Promise<ServiceResult> {
    const tecnico = await findTecnicoById(id);
    if (!tecnico) {
      return { status: 404, body: { error: "Técnico no encontrado" } };
    }

    await deactivateTecnico(id);
    return { status: 200, body: { message: "Técnico desactivado" } };
  }
}
