import { hash } from "bcryptjs";
import { randomInt } from "node:crypto";
import { enviarCodigoTecnico } from "@/lib/mailer";
import {
  applyCortesVencidos,
  cerrarCorteById,
  deactivateTecnico,
  existsCorreoEnUsuarioActivo,
  findTecnicoById,
  isCoordinadorActivo,
  listAsignacionesByTecnicoId,
  listTecnicosByRole,
  updateTecnico,
  updateTecnicoCodigo,
  type TecnicoUpdateInput,
} from "@/models/tecnicos.model";

export async function listarTecnicos(userId: string, rol: string) {
  return listTecnicosByRole(userId, rol);
}

export async function obtenerTecnicoDetalle(id: string, userId: string, rol: string) {
  const tecnico = await findTecnicoById(id);
  if (!tecnico) return { status: 404 as const, body: { error: "Técnico no encontrado" } };

  if (rol === "coordinador" && tecnico.coordinador_id !== userId) {
    return { status: 403 as const, body: { error: "Sin permisos" } };
  }

  const asignaciones = await listAsignacionesByTecnicoId(id);
  return { status: 200 as const, body: { ...tecnico, asignaciones } };
}

export async function actualizarTecnico(id: string, body: TecnicoUpdateInput) {
  const tecnico = await findTecnicoById(id);
  if (!tecnico) return { status: 404 as const, body: { error: "Técnico no encontrado" } };

  if (body.correo) {
    const correoDuplicado = await existsCorreoEnUsuarioActivo(body.correo, tecnico.correo);
    if (correoDuplicado) {
      return { status: 409 as const, body: { error: "El correo ya está registrado" } };
    }
  }

  if (body.coordinador_id) {
    const coordinadorActivo = await isCoordinadorActivo(body.coordinador_id);
    if (!coordinadorActivo) {
      return { status: 400 as const, body: { error: "Coordinador inválido o inactivo" } };
    }
  }

  const actualizado = await updateTecnico(id, body);
  if (!actualizado) return { status: 404 as const, body: { error: "Técnico no encontrado" } };
  return { status: 200 as const, body: actualizado };
}

export async function regenerarCodigoTecnico(id: string) {
  const tecnico = await findTecnicoById(id);
  if (!tecnico) return { status: 404 as const, body: { error: "Técnico no encontrado" } };

  const codigo = randomInt(10000, 100000).toString();
  const hashCodigo = await hash(codigo, 12);

  await updateTecnicoCodigo(id, codigo, hashCodigo);

  if (tecnico.fecha_limite) {
    try {
      await enviarCodigoTecnico(tecnico.correo, tecnico.nombre, codigo, new Date(tecnico.fecha_limite));
    } catch (err) {
      console.error("[Código técnico] Error al enviar correo:", err);
    }
  }

  return { status: 200 as const, body: { message: "Código generado y enviado", codigo } };
}

export async function aplicarCortes() {
  const tecnicos = await applyCortesVencidos();
  return {
    status: 200 as const,
    body: {
      message: `Corte aplicado a ${tecnicos.length} técnico(s)`,
      tecnicos,
    },
  };
}

export async function cerrarCorte(id: string, userId: string, rol: string) {
  const tecnico = await findTecnicoById(id);
  if (!tecnico) return { status: 404 as const, body: { error: "Técnico no encontrado" } };

  if (rol === "coordinador" && tecnico.coordinador_id !== userId) {
    return { status: 403 as const, body: { error: "Sin permisos sobre este técnico" } };
  }

  const actualizado = await cerrarCorteById(id);
  if (!actualizado) return { status: 404 as const, body: { error: "Asignación de corte no encontrada" } };
  return { status: 200 as const, body: { message: "Período cerrado", tecnico: actualizado } };
}

export async function eliminarTecnico(id: string) {
  const result = await deactivateTecnico(id);
  if (!result) return { status: 404 as const, body: { error: "Técnico no encontrado" } };
  return { status: 200 as const, body: { message: "Técnico desactivado" } };
}
