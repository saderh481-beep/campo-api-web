import type {
  Bitacora,
  BitacoraListItem,
  BitacoraUpdate,
  BitacoraFiltros,
  PdfVersion,
} from "@/domain/entities/bitacora.entity";

export interface IBitacoraRepository {
  findById(id: string): Promise<Bitacora | null>;
  findByIdWithAccessCheck(id: string, userId: string, rol: string): Promise<Bitacora | null>;
  findAll(filtros: BitacoraFiltros, userId: string, rol: string): Promise<BitacoraListItem[]>;
  update(id: string, data: BitacoraUpdate): Promise<Bitacora | null>;
  updatePdfConfig(id: string, pdfEdicion: Record<string, unknown>): Promise<Bitacora | null>;
  existsById(id: string): Promise<boolean>;
  existsByIdWithAccess(id: string, userId: string, rol: string): Promise<boolean>;
}

export interface IPdfVersionRepository {
  findByBitacoraId(bitacoraId: string): Promise<PdfVersion[]>;
  getNextVersion(bitacoraId: string): Promise<number>;
  create(params: {
    bitacoraId: string;
    version: number;
    r2Key: string;
    sha256: string;
    inmutable: boolean;
    generadoPor: string;
  }): Promise<void>;
}

export interface IConfiguracionRepository {
  getPdfConfig(): Promise<Record<string, unknown>>;
}

export interface IPdfService {
  generarPdfBitacora(
    bitacora: Record<string, unknown>,
    options: { impresion?: boolean },
    config: Record<string, unknown>
  ): Promise<Uint8Array>;
}

export interface ICloudStorageService {
  subirPDF(buffer: Buffer, folder: string, publicId: string): Promise<{ secure_url: string }>;
}
