import { createHash } from "node:crypto";
import type {
  Bitacora,
  BitacoraListItem,
  BitacoraUpdate,
  BitacoraFiltros,
  PdfVersion,
  PdfConfig,
} from "@/domain/entities/bitacora.entity";
import type {
  IPdfService,
  ICloudStorageService,
} from "@/domain/interfaces/bitacora.interface";
import {
  findBitacoraByIdWithAccess,
  findAllBitacoras,
  updateBitacora,
  updateBitacoraPdfConfig,
  existsBitacoraByIdWithAccess,
  findPdfVersionesByBitacoraId,
  getNextPdfVersion,
  createPdfVersion,
  getPdfConfig,
} from "@/repositories/bitacora.repository";
import { generarPdfBitacora } from "@/lib/pdf";
import { subirPDF } from "@/lib/campo-files";

export type ServiceResult<T = unknown> = {
  status: 200 | 201 | 400 | 403 | 404 | 409;
  body: T;
};

class PdfServiceAdapter implements IPdfService {
  async generarPdfBitacora(
    bitacora: Record<string, unknown>,
    options: { impresion?: boolean },
    config: Record<string, unknown>
  ): Promise<Uint8Array> {
    return generarPdfBitacora(
      bitacora,
      options,
      config as PdfConfig
    );
  }
}

class CloudStorageAdapter implements ICloudStorageService {
  async subirPDF(buffer: Buffer, folder: string, publicId: string): Promise<{ secure_url: string }> {
    const result = await subirPDF(publicId, buffer, `${publicId}.pdf`);
    return { secure_url: result.url };
  }
}

export class BitacoraService {
  constructor(
    private readonly pdfService: IPdfService = new PdfServiceAdapter(),
    private readonly storageService: ICloudStorageService = new CloudStorageAdapter()
  ) {}

  async listar(filtros: BitacoraFiltros, userId: string, rol: string): Promise<BitacoraListItem[]> {
    return findAllBitacoras(filtros, userId, rol);
  }

  async obtenerPorId(id: string, userId: string, rol: string): Promise<ServiceResult<Bitacora>> {
    const bitacora = await findBitacoraByIdWithAccess(id, userId, rol);
    if (!bitacora) {
      return { status: 404, body: { error: "Bitácora no encontrada" } as unknown as Bitacora };
    }
    return { status: 200, body: bitacora };
  }

  async actualizar(id: string, data: BitacoraUpdate, userId: string, rol: string): Promise<ServiceResult> {
    const tieneAcceso = await existsBitacoraByIdWithAccess(id, userId, rol);
    if (!tieneAcceso) {
      return { status: 404, body: { error: "Bitácora no encontrada" } };
    }

    const actualizada = await updateBitacora(id, data);
    if (!actualizada) {
      return { status: 404, body: { error: "Bitácora no encontrada" } };
    }

    return { status: 200, body: actualizada };
  }

  async actualizarPdfConfig(
    id: string,
    pdfEdicion: Record<string, unknown>,
    userId: string,
    rol: string
  ): Promise<ServiceResult> {
    const tieneAcceso = await existsBitacoraByIdWithAccess(id, userId, rol);
    if (!tieneAcceso) {
      return { status: 404, body: { error: "Bitácora no encontrada" } };
    }

    const actualizada = await updateBitacoraPdfConfig(id, pdfEdicion);
    if (!actualizada) {
      return { status: 404, body: { error: "Bitácora no encontrada" } };
    }

    return { status: 200, body: actualizada };
  }

  async generarPdf(
    id: string,
    userId: string,
    rol: string,
    options: { descargar?: boolean; impresion?: boolean } = {}
  ): Promise<ServiceResult<Buffer> | Response> {
    const bitacora = await findBitacoraByIdWithAccess(id, userId, rol);
    if (!bitacora) {
      return { status: 404, body: { error: "Bitácora no encontrada" } as unknown as Buffer };
    }

    const pdfConfig = await getPdfConfig();
    const pdfBytes = await this.pdfService.generarPdfBitacora(
      bitacora as unknown as Record<string, unknown>,
      { impresion: options.impresion },
      pdfConfig
    );

    const buffer = Buffer.from(pdfBytes);
    const disposition = options.descargar
      ? `attachment; filename="bitacora-${id}.pdf"`
      : `inline; filename="bitacora-${id}.pdf"`;

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
      },
    }) as unknown as ServiceResult<Buffer>;
  }

  async imprimirPdf(id: string, userId: string, rol: string): Promise<ServiceResult<Buffer> | Response> {
    const bitacora = await findBitacoraByIdWithAccess(id, userId, rol);
    if (!bitacora) {
      return { status: 404, body: { error: "Bitácora no encontrada" } as unknown as Buffer };
    }

    const pdfConfig = await getPdfConfig();
    const pdfBytes = await this.pdfService.generarPdfBitacora(
      bitacora as unknown as Record<string, unknown>,
      { impresion: true },
      pdfConfig
    );

    const buffer = Buffer.from(pdfBytes);
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const nextVersion = await getNextPdfVersion(id);

    const { secure_url } = await this.storageService.subirPDF(
      buffer,
      `campo/pdfs/${bitacora.tecnico_id}/${new Date().getMonth() + 1}`,
      `bitacora-${id}-impresion-${Date.now()}`
    );

    await createPdfVersion({
      bitacoraId: id,
      version: nextVersion,
      r2Key: secure_url,
      sha256,
      inmutable: false,
      generadoPor: userId,
    });

    return new Response(buffer, {
      headers: { "Content-Type": "application/pdf" },
    }) as unknown as ServiceResult<Buffer>;
  }

  async listarVersiones(id: string, userId: string, rol: string): Promise<ServiceResult<PdfVersion[]>> {
    const bitacora = await findBitacoraByIdWithAccess(id, userId, rol);
    if (!bitacora) {
      return { status: 404, body: { error: "Bitácora no encontrada" } as unknown as PdfVersion[] };
    }

    const versiones = await findPdfVersionesByBitacoraId(id);
    return { status: 200, body: versiones };
  }
}
