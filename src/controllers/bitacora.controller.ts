import type { Context } from "hono";
import type { AppEnv } from "@/types/http";
import { BitacoraService } from "@/services/bitacora.service";
import type { BitacoraUpdate, BitacoraFiltros } from "@/domain/entities/bitacora.entity";

const bitacoraService = new BitacoraService();

export async function getBitacoras(c: Context<AppEnv>) {
  const user = c.get("user");
  const query = c.req.query();

  const filtros: BitacoraFiltros = {
    tecnico_id: query.tecnico_id,
    mes: query.mes ? parseInt(query.mes, 10) : undefined,
    anio: query.anio ? parseInt(query.anio, 10) : undefined,
    estado: query.estado,
    tipo: query.tipo,
  };

  const rows = await bitacoraService.listar(filtros, user.sub, user.rol);
  return c.json(rows);
}

export async function getBitacoraById(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const user = c.get("user");
  const result = await bitacoraService.obtenerPorId(id, user.sub, user.rol);

  if (result.status === 200) {
    return c.json(result.body);
  }
  return c.json(result.body, result.status);
}

export async function patchBitacora(c: Context<AppEnv>, body: BitacoraUpdate) {
  const { id } = c.req.param();
  const user = c.get("user");
  const result = await bitacoraService.actualizar(id, body, user.sub, user.rol);
  return c.json(result.body, result.status);
}

export async function patchBitacoraPdfConfig(
  c: Context<AppEnv>,
  body: { pdf_edicion: Record<string, unknown> }
) {
  const { id } = c.req.param();
  const user = c.get("user");
  const result = await bitacoraService.actualizarPdfConfig(id, body.pdf_edicion, user.sub, user.rol);
  return c.json(result.body, result.status);
}

export async function getBitacoraPdf(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const user = c.get("user");
  const result = await bitacoraService.generarPdf(id, user.sub, user.rol);

  if (result instanceof Response) {
    return result;
  }

  if (result.status === 200) {
    const buffer = result.body as unknown as Buffer;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="bitacora-${id}.pdf"`,
      },
    });
  }

  return c.json(result.body, result.status);
}

export async function getBitacoraPdfDescargar(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const user = c.get("user");
  const result = await bitacoraService.generarPdf(id, user.sub, user.rol, { descargar: true });

  if (result instanceof Response) {
    return result;
  }

  if (result.status === 200) {
    const buffer = result.body as unknown as Buffer;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bitacora-${id}.pdf"`,
      },
    });
  }

  return c.json(result.body, result.status);
}

export async function postBitacoraImprimir(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const user = c.get("user");
  const result = await bitacoraService.imprimirPdf(id, user.sub, user.rol);

  if (result instanceof Response) {
    return result;
  }

  return c.json(result.body, result.status);
}

export async function getBitacoraVersiones(c: Context<AppEnv>) {
  const { id } = c.req.param();
  const user = c.get("user");
  const result = await bitacoraService.listarVersiones(id, user.sub, user.rol);

  if (result.status === 200) {
    return c.json(result.body);
  }
  return c.json(result.body, result.status);
}
