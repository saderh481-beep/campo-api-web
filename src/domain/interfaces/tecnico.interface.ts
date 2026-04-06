import type { Tecnico, TecnicoDetalle, TecnicoUpdate, AsignacionBeneficiario } from "@/domain/entities/tecnico.entity";

export interface ITecnicoRepository {
  findById(id: string): Promise<Tecnico | null>;
  findByCoordinadorId(coordinadorId: string): Promise<Tecnico[]>;
  findAll(): Promise<Tecnico[]>;
  existsByCorreo(correo: string, exceptCorreo?: string): Promise<boolean>;
  update(id: string, data: TecnicoUpdate): Promise<Tecnico | null>;
  updateCodigo(id: string, codigo: string, hashCodigo: string): Promise<void>;
  deactivate(id: string): Promise<void>;
}

export interface ITecnicoDetalleRepository {
  findByTecnicoId(tecnicoId: string): Promise<TecnicoDetalle | null>;
  findByCoordinadorId(coordinadorId: string): Promise<TecnicoDetalle[]>;
  upsert(tecnico_id: string, coordinador_id: string, fecha_limite: string): Promise<TecnicoDetalle>;
  update(tecnicoId: string, data: Partial<TecnicoDetalle>): Promise<TecnicoDetalle | null>;
  listTecnicosIdsByCoordinadorId(coordinadorId: string): Promise<string[]>;
}

export interface IAsignacionRepository {
  listByTecnicoId(tecnicoId: string): Promise<AsignacionBeneficiario[]>;
}

export interface ICodigoMailerService {
  enviarCodigoTecnico(correo: string, nombre: string, codigo: string, fechaLimite: Date): Promise<void>;
}
