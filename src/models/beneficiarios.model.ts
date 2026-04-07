import { sql } from "@/db";

export type BeneficiarioInput = {
  nombre: string;
  municipio: string;
  localidad?: string;
  localidad_id?: string;
  direccion?: string;
  cp?: string;
  telefono_principal?: string;
  telefono_secundario?: string;
  coord_parcela?: string;
  tecnico_id: string;
};

export type BeneficiarioUpdateInput = {
  nombre?: string;
  municipio?: string;
  localidad?: string;
  localidad_id?: string;
  direccion?: string;
  cp?: string;
  telefono_principal?: string;
  telefono_secundario?: string;
  coord_parcela?: string;
  tecnico_id?: string;
};

export type BeneficiarioWithRelations = {
  id: string;
  tecnico_id: string;
  nombre: string;
  municipio: string;
  localidad: string | null;
  localidad_id: string | null;
  direccion: string | null;
  cp: string | null;
  telefono_principal: string | null;
  telefono_secundario: string | null;
  coord_parcela: string | null;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
  cadenas?: Array<{ id: string; nombre: string }>;
  documentos?: Array<{
    id: string;
    tipo: string;
    nombre_original: string | null;
    r2_key: string;
    sha256: string;
    bytes: number | null;
    subido_por: string;
    created_at: Date;
  }>;
};

export async function listBeneficiariosByUser(userId: string, rol: string) {
  if (rol === "admin") {
    return sql`
      SELECT b.id, b.tecnico_id, b.nombre, b.municipio, b.localidad, b.localidad_id,
             b.direccion, b.cp, b.telefono_principal, b.telefono_secundario,
             b.coord_parcela, b.activo, b.created_at, b.updated_at
      FROM beneficiarios b
      WHERE b.activo = true
      ORDER BY b.nombre
    `;
  }

  return sql`
    SELECT b.id, b.tecnico_id, b.nombre, b.municipio, b.localidad, b.localidad_id,
           b.direccion, b.cp, b.telefono_principal, b.telefono_secundario,
           b.coord_parcela, b.activo, b.created_at, b.updated_at
    FROM beneficiarios b
    JOIN usuarios t ON t.id = b.tecnico_id AND t.rol = 'tecnico' AND t.activo = true
    JOIN tecnico_detalles td ON td.tecnico_id = t.id AND td.activo = true
    WHERE td.coordinador_id = ${userId} AND b.activo = true
    ORDER BY b.nombre
  `;
}

export async function findBeneficiarioById(id: string) {
  const [row] = await sql`
    SELECT id, tecnico_id, nombre, municipio, localidad, localidad_id,
           direccion, cp, telefono_principal, telefono_secundario,
           coord_parcela, activo, created_at, updated_at
    FROM beneficiarios
    WHERE id = ${id} AND activo = true
  `;
  return row ?? null;
}

export async function findBeneficiarioByIdWithAccess(id: string, userId: string, rol: string) {
  const [row] =
    rol === "admin"
      ? await sql`SELECT * FROM beneficiarios WHERE id = ${id} AND activo = true`
      : await sql`
          SELECT b.*
          FROM beneficiarios b
          JOIN tecnico_detalles td ON td.tecnico_id = b.tecnico_id AND td.activo = true
          WHERE b.id = ${id} AND td.coordinador_id = ${userId} AND b.activo = true
        `;
  return row ?? null;
}

export async function findBeneficiarioWithRelations(id: string) {
  const beneficiario = await findBeneficiarioById(id);
  if (!beneficiario) return null;

  const cadenas = await sql`
    SELECT cp.id, cp.nombre
    FROM beneficiario_cadenas bc
    JOIN cadenas_productivas cp ON cp.id = bc.cadena_id
    WHERE bc.beneficiario_id = ${id} AND bc.activo = true AND cp.activo = true
  `;

  const documentos = await sql`
    SELECT id, tipo, nombre_original, r2_key, sha256, bytes, subido_por, created_at
    FROM documentos WHERE beneficiario_id = ${id}
  `;

  return {
    ...beneficiario,
    cadenas,
    documentos,
  };
}

export async function existsBeneficiarioById(id: string) {
  const [row] = await sql`SELECT id FROM beneficiarios WHERE id = ${id} AND activo = true`;
  return Boolean(row);
}

export async function existsTecnicoActivo(id: string) {
  const [row] = await sql`
    SELECT id FROM usuarios WHERE id = ${id} AND rol = 'tecnico' AND activo = true
  `;
  return Boolean(row);
}

export async function existsTecnicoActivoWithCoordinador(tecnicoId: string, coordinadorId: string) {
  const [row] = await sql`
    SELECT t.id
    FROM usuarios t
    JOIN tecnico_detalles td ON td.tecnico_id = t.id AND td.activo = true
    WHERE t.id = ${tecnicoId} AND t.rol = 'tecnico' AND t.activo = true AND td.coordinador_id = ${coordinadorId}
  `;
  return Boolean(row);
}

export async function createBeneficiario(
  input: BeneficiarioInput & { coordParcela: string | null },
  userId: string
) {
  const [row] = await sql`
    INSERT INTO beneficiarios (nombre, municipio, localidad, localidad_id, direccion, cp,
                              telefono_principal, telefono_secundario, coord_parcela, tecnico_id)
    VALUES (${input.nombre}, ${input.municipio}, ${input.localidad ?? null},
            ${input.localidad_id ?? null}, ${input.direccion ?? null}, ${input.cp ?? null},
            ${input.telefono_principal ?? null}, ${input.telefono_secundario ?? null},
            ${input.coordParcela}::point, ${input.tecnico_id})
    RETURNING id, nombre, municipio, localidad, localidad_id, direccion, cp,
              telefono_principal, telefono_secundario, coord_parcela, tecnico_id, activo, created_at, updated_at
  `;
  return row;
}

export async function createBeneficiarioWithAsignacion(
  input: BeneficiarioInput & { coordParcela: string | null },
  userId: string
) {
  const reserved = await sql.reserve();
  try {
    await reserved`BEGIN`;
    const [row] = await reserved`
      INSERT INTO beneficiarios (nombre, municipio, localidad, localidad_id, direccion, cp,
                                telefono_principal, telefono_secundario, coord_parcela, tecnico_id)
      VALUES (${input.nombre}, ${input.municipio}, ${input.localidad ?? null},
              ${input.localidad_id ?? null}, ${input.direccion ?? null}, ${input.cp ?? null},
              ${input.telefono_principal ?? null}, ${input.telefono_secundario ?? null},
              ${input.coordParcela}::point, ${input.tecnico_id})
      RETURNING id, nombre, municipio, localidad, localidad_id, direccion, cp,
                telefono_principal, telefono_secundario, coord_parcela, tecnico_id, activo, created_at, updated_at
    `;
    await reserved`
      INSERT INTO asignaciones_beneficiario (tecnico_id, beneficiario_id, asignado_por)
      VALUES (${input.tecnico_id}, ${row.id}, ${userId})
    `;
    await reserved`COMMIT`;
    return row;
  } catch (err) {
    await reserved`ROLLBACK`;
    throw err;
  } finally {
    reserved.release();
  }
}

export async function updateBeneficiario(
  id: string,
  input: BeneficiarioUpdateInput & { coordParcela: string | null }
) {
  const [row] = await sql`
    UPDATE beneficiarios SET
      nombre      = COALESCE(${input.nombre ?? null}, nombre),
      municipio   = COALESCE(${input.municipio ?? null}, municipio),
      localidad   = COALESCE(${input.localidad ?? null}, localidad),
      localidad_id = COALESCE(${input.localidad_id ?? null}, localidad_id),
      direccion   = COALESCE(${input.direccion ?? null}, direccion),
      cp          = COALESCE(${input.cp ?? null}, cp),
      telefono_principal  = COALESCE(${input.telefono_principal ?? null}, telefono_principal),
      telefono_secundario = COALESCE(${input.telefono_secundario ?? null}, telefono_secundario),
      coord_parcela = COALESCE(${input.coordParcela}::point, coord_parcela),
      tecnico_id  = COALESCE(${input.tecnico_id ?? null}, tecnico_id),
      updated_at  = NOW()
    WHERE id = ${id} AND activo = true
    RETURNING id, nombre, municipio, localidad, localidad_id, direccion, cp,
              telefono_principal, telefono_secundario, coord_parcela, tecnico_id, activo, created_at, updated_at
  `;
  return row ?? null;
}

export async function updateBeneficiarioWithAsignacion(
  id: string,
  tecnicoAnteriorId: string,
  nuevoTecnicoId: string,
  userId: string,
  input: BeneficiarioUpdateInput & { coordParcela: string | null }
) {
  const reserved = await sql.reserve();
  try {
    await reserved`BEGIN`;
    const [row] = await reserved`
      UPDATE beneficiarios SET
        nombre      = COALESCE(${input.nombre ?? null}, nombre),
        municipio   = COALESCE(${input.municipio ?? null}, municipio),
        localidad   = COALESCE(${input.localidad ?? null}, localidad),
        localidad_id = COALESCE(${input.localidad_id ?? null}, localidad_id),
        direccion   = COALESCE(${input.direccion ?? null}, direccion),
        cp          = COALESCE(${input.cp ?? null}, cp),
        telefono_principal  = COALESCE(${input.telefono_principal ?? null}, telefono_principal),
        telefono_secundario = COALESCE(${input.telefono_secundario ?? null}, telefono_secundario),
        coord_parcela = COALESCE(${input.coordParcela}::point, coord_parcela),
        tecnico_id  = COALESCE(${nuevoTecnicoId ?? null}, tecnico_id),
        updated_at  = NOW()
      WHERE id = ${id} AND activo = true
      RETURNING id, nombre, municipio, localidad, localidad_id, direccion, cp,
                telefono_principal, telefono_secundario, coord_parcela, tecnico_id, activo, created_at, updated_at
    `;
    if (nuevoTecnicoId && nuevoTecnicoId !== tecnicoAnteriorId) {
      await reserved`
        UPDATE asignaciones_beneficiario
        SET activo = false, removido_en = NOW()
        WHERE beneficiario_id = ${id} AND activo = true
      `;
      await reserved`
        INSERT INTO asignaciones_beneficiario (tecnico_id, beneficiario_id, asignado_por)
        VALUES (${nuevoTecnicoId}, ${id}, ${userId})
      `;
    }
    await reserved`COMMIT`;
    return row ?? null;
  } catch (err) {
    await reserved`ROLLBACK`;
    throw err;
  } finally {
    reserved.release();
  }
}

export async function deactivateBeneficiario(id: string) {
  const reserved = await sql.reserve();
  try {
    await reserved`BEGIN`;
    const [row] = await reserved`
      UPDATE beneficiarios
      SET activo = false, updated_at = NOW()
      WHERE id = ${id} AND activo = true
      RETURNING id, nombre, municipio, localidad, localidad_id, direccion, cp,
                telefono_principal, telefono_secundario, coord_parcela, tecnico_id, activo, created_at, updated_at
    `;
    await reserved`
      UPDATE asignaciones_beneficiario
      SET activo = false, removido_en = NOW()
      WHERE beneficiario_id = ${id} AND activo = true
    `;
    await reserved`COMMIT`;
    return row ?? null;
  } catch (err) {
    await reserved`ROLLBACK`;
    throw err;
  } finally {
    reserved.release();
  }
}
