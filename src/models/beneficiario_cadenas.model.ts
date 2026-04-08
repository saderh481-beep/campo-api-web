import { sql } from "@/db";

export type BeneficiarioCadenaInput = {
  beneficiario_id: string;
  cadena_id: string;
};

export async function getCadenasByBeneficiarioId(beneficiarioId: string) {
  return await sql`
    SELECT cp.id, cp.nombre
    FROM beneficiario_cadenas bc
    JOIN cadenas_productivas cp ON cp.id = bc.cadena_id
    WHERE bc.beneficiario_id = ${beneficiarioId} AND bc.activo = true AND cp.activo = true
  `;
}

export async function updateBeneficiarioCadenas(beneficiarioId: string, cadenaIds: string[]) {
  await sql`UPDATE beneficiario_cadenas SET activo = false WHERE beneficiario_id = ${beneficiarioId}`;
  
  if (cadenaIds.length > 0) {
    await sql`
      INSERT INTO beneficiario_cadenas (beneficiario_id, cadena_id, activo, asignado_en)
      SELECT ${beneficiarioId}, unnest(${cadenaIds}::uuid[]), true, NOW()
      ON CONFLICT (beneficiario_id, cadena_id)
      DO UPDATE SET activo = true, asignado_en = NOW()
    `;
  }
}

export async function addBeneficiarioCadena(beneficiarioId: string, cadenaId: string) {
  const [row] = await sql`
    INSERT INTO beneficiario_cadenas (beneficiario_id, cadena_id, activo, asignado_en)
    VALUES (${beneficiarioId}, ${cadenaId}, true, NOW())
    ON CONFLICT (beneficiario_id, cadena_id)
    DO UPDATE SET activo = true, asignado_en = NOW()
    RETURNING beneficiario_id, cadena_id, activo, asignado_en
  `;
  return row;
}

export async function removeBeneficiarioCadena(beneficiarioId: string, cadenaId: string) {
  const [row] = await sql`
    UPDATE beneficiario_cadenas SET activo = false, asignado_en = NOW()
    WHERE beneficiario_id = ${beneficiarioId} AND cadena_id = ${cadenaId} AND activo = true
    RETURNING beneficiario_id, cadena_id
  `;
  return row ?? null;
}
