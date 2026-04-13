import { sql } from "@/db";
import type {
  Bitacora,
  BitacoraListItem,
  BitacoraUpdate,
  BitacoraFiltros,
  PdfVersion,
} from "@/domain/entities/bitacora.entity";

export async function findBitacoraById(id: string): Promise<Bitacora | null> {
  const [row] = await sql`SELECT * FROM bitacoras WHERE id = ${id}`;
  return (row ?? null) as unknown as Bitacora | null;
}

export async function findBitacoraByIdWithAccess(
  id: string,
  userId: string,
  rol: string
): Promise<Record<string, unknown> | null> {
  const [row] =
    rol === "admin"
      ? await sql`
          SELECT b.*, 
                 t.nombre AS tecnico_nombre,
                 be.nombre AS beneficiario_nombre,
                 be.municipio AS beneficiario_municipio,
                 be.localidad AS beneficiario_localidad
          FROM bitacoras b
          LEFT JOIN usuarios t ON t.id = b.tecnico_id
          LEFT JOIN beneficiarios be ON be.id = b.beneficiario_id
          WHERE b.id = ${id}`
      : rol === "coordinador"
        ? await sql`
            SELECT b.*, 
                   t.nombre AS tecnico_nombre,
                   be.nombre AS beneficiario_nombre,
                   be.municipio AS beneficiario_municipio,
                   be.localidad AS beneficiario_localidad
            FROM bitacoras b
            LEFT JOIN usuarios t ON t.id = b.tecnico_id
            LEFT JOIN beneficiarios be ON be.id = b.beneficiario_id
            JOIN tecnico_detalles td ON td.tecnico_id = b.tecnico_id AND td.activo = true
            WHERE b.id = ${id} AND td.coordinador_id = ${userId}
          `
        : await sql`
            SELECT b.*, 
                   t.nombre AS tecnico_nombre,
                   be.nombre AS beneficiario_nombre,
                   be.municipio AS beneficiario_municipio,
                   be.localidad AS beneficiario_localidad
            FROM bitacoras b
            LEFT JOIN usuarios t ON t.id = b.tecnico_id
            LEFT JOIN beneficiarios be ON be.id = b.beneficiario_id
            WHERE b.id = ${id} AND b.tecnico_id = ${userId}
          `;
  return (row ?? null) as Record<string, unknown> | null;
}

export async function findAllBitacoras(
  filtros: BitacoraFiltros,
  userId: string,
  rol: string
): Promise<BitacoraListItem[]> {
  const condiciones: string[] = [];
  const params: Array<string | number> = [];
  let i = 1;

  if (rol === "coordinador") {
    condiciones.push(`td.coordinador_id = $${i++}`);
    params.push(userId);
  }
  if (filtros.tecnico_id) {
    condiciones.push(`b.tecnico_id = $${i++}`);
    params.push(filtros.tecnico_id);
  }
  if (filtros.mes) {
    condiciones.push(`EXTRACT(MONTH FROM b.fecha_inicio) = $${i++}`);
    params.push(filtros.mes);
  }
  if (filtros.anio) {
    condiciones.push(`EXTRACT(YEAR FROM b.fecha_inicio) = $${i++}`);
    params.push(filtros.anio);
  }
  if (filtros.estado) {
    condiciones.push(`b.estado = $${i++}`);
    params.push(filtros.estado);
  }
  if (filtros.tipo) {
    condiciones.push(`b.tipo = $${i++}`);
    params.push(filtros.tipo);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

  const rows = await sql.unsafe(
    `SELECT b.id, b.tipo, b.estado, b.fecha_inicio, b.fecha_fin,
            t.nombre AS tecnico_nombre,
            be.nombre AS beneficiario_nombre,
            cp.nombre AS cadena_nombre,
            a.nombre AS actividad_nombre
     FROM bitacoras b
     LEFT JOIN tecnico_detalles td ON td.tecnico_id = b.tecnico_id AND td.activo = true
     LEFT JOIN usuarios t ON t.id = b.tecnico_id
     LEFT JOIN beneficiarios be ON be.id = b.beneficiario_id
     LEFT JOIN cadenas_productivas cp ON cp.id = b.cadena_productiva_id
     LEFT JOIN actividades a ON a.id = b.actividad_id
     LEFT JOIN usuarios u ON u.id = td.coordinador_id
     ${where}
     ORDER BY b.fecha_inicio DESC
     LIMIT 100`,
    params
  );
  return rows as unknown as BitacoraListItem[];
}

export async function updateBitacora(id: string, data: BitacoraUpdate): Promise<Bitacora | null> {
  const [row] = await sql`
    UPDATE bitacoras SET
      observaciones_coordinador = COALESCE(${data.observaciones ?? null}, observaciones_coordinador),
      actividades_desc          = COALESCE(${data.actividades_realizadas ?? null}, actividades_desc),
      updated_at                = NOW()
    WHERE id = ${id}
    RETURNING id, tipo, estado, observaciones_coordinador, actividades_desc, updated_at
  `;
  return (row ?? null) as unknown as Bitacora | null;
}

export async function updateBitacoraPdfConfig(
  id: string,
  pdfEdicion: Record<string, unknown>
): Promise<Bitacora | null> {
  const [row] = await sql`
    UPDATE bitacoras
    SET pdf_edicion = ${JSON.stringify(pdfEdicion)}::jsonb,
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, pdf_edicion, updated_at
  `;
  return (row ?? null) as unknown as Bitacora | null;
}

export async function existsBitacoraById(id: string): Promise<boolean> {
  const [row] = await sql`SELECT id FROM bitacoras WHERE id = ${id}`;
  return Boolean(row);
}

export async function existsBitacoraByIdWithAccess(
  id: string,
  userId: string,
  rol: string
): Promise<boolean> {
  const [row] =
    rol === "admin"
      ? await sql`SELECT id FROM bitacoras WHERE id = ${id}`
      : await sql`
          SELECT b.id FROM bitacoras b
          JOIN tecnico_detalles td ON td.tecnico_id = b.tecnico_id AND td.activo = true
          WHERE b.id = ${id} AND td.coordinador_id = ${userId}
        `;
  return Boolean(row);
}

export async function findPdfVersionesByBitacoraId(bitacoraId: string): Promise<PdfVersion[]> {
  const rows = await sql`
    SELECT id, version, r2_key, sha256, inmutable, generado_por, created_at
    FROM pdf_versiones
    WHERE bitacora_id = ${bitacoraId}
    ORDER BY version DESC
  `;
  return rows as unknown as PdfVersion[];
}

export async function getNextPdfVersion(bitacoraId: string): Promise<number> {
  const [{ next_version }] = await sql`
    SELECT COALESCE(MAX(version), 0) + 1 AS next_version
    FROM pdf_versiones
    WHERE bitacora_id = ${bitacoraId}
  `;
  return next_version as number;
}

export async function createPdfVersion(params: {
  bitacoraId: string;
  version: number;
  r2Key: string;
  sha256: string;
  inmutable: boolean;
  generadoPor: string;
}): Promise<void> {
  await sql`
    INSERT INTO pdf_versiones (bitacora_id, version, r2_key, sha256, inmutable, generado_por)
    VALUES (${params.bitacoraId}, ${params.version}, ${params.r2Key}, ${params.sha256}, ${params.inmutable ? 1 : 0}, ${params.generadoPor})
  `;
}

export async function getPdfConfig(): Promise<Record<string, unknown>> {
  const [row] = await sql`
    SELECT valor FROM configuraciones WHERE clave = 'pdf_encabezado'
  `;
  return (row?.valor ?? {}) as Record<string, unknown>;
}

export async function updateBitacoraFotoRostro(
  id: string,
  fotoRostroUrl: string
): Promise<Bitacora | null> {
  const [row] = await sql`
    UPDATE bitacoras SET
      foto_rostro_url = ${fotoRostroUrl},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, foto_rostro_url, updated_at
  `;
  return (row ?? null) as unknown as Bitacora | null;
}

export async function updateBitacoraFirma(
  id: string,
  firmaUrl: string
): Promise<Bitacora | null> {
  const [row] = await sql`
    UPDATE bitacoras SET
      firma_url = ${firmaUrl},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, firma_url, updated_at
  `;
  return (row ?? null) as unknown as Bitacora | null;
}

export async function updateBitacoraFotosCampo(
  id: string,
  fotosCampo: string[]
): Promise<Bitacora | null> {
  const [row] = await sql`
    UPDATE bitacoras SET
      fotos_campo = ${JSON.stringify(fotosCampo)}::jsonb,
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, fotos_campo, updated_at
  `;
  return (row ?? null) as unknown as Bitacora | null;
}

export async function updateBitacoraPdfActividades(
  id: string,
  pdfUrl: string
): Promise<Bitacora | null> {
  const [row] = await sql`
    UPDATE bitacoras SET
      pdf_actividades_url = ${pdfUrl},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, pdf_actividades_url, updated_at
  `;
  return (row ?? null) as unknown as Bitacora | null;
}
