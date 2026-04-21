import { sql } from "@/infrastructure/db";

export type Documento = {
  id: string;
  key: string;
  titulo: string;
  contenido: string;
  categoria: string | null;
  idioma: string;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
};

export async function listDocumentos(): Promise<Documento[]> {
  const rows = await sql`
    SELECT id, key, titulo, contenido, categoria, idioma, creado_por, created_at, updated_at
    FROM documento
    ORDER BY categoria, titulo
  `;
  return rows as unknown as Documento[];
}

export async function getDocumentoByKey(key: string): Promise<Documento | null> {
  const [row] = await sql`
    SELECT id, key, titulo, contenido, categoria, idioma, creado_por, created_at, updated_at
    FROM documento
    WHERE key = ${key}
  `;
  return (row as unknown as Documento) || null;
}

export async function createDocumento(
  key: string,
  titulo: string,
  contenido: string,
  creadoPor: string,
  categoria?: string
): Promise<Documento> {
  const cat = categoria || null;
  const [row] = await sql`
    INSERT INTO documento (key, titulo, contenido, categoria, creado_por)
    VALUES (${key}, ${titulo}, ${contenido}, ${cat}, ${creadoPor})
    RETURNING id, key, titulo, contenido, categoria, idioma, creado_por, created_at, updated_at
  `;
  return row as unknown as Documento;
}

export async function updateDocumento(
  key: string,
  data: { titulo?: string; contenido?: string; categoria?: string }
): Promise<Documento | null> {
  const existing = await getDocumentoByKey(key);
  if (!existing) return null;

  const titulo = data.titulo ?? existing.titulo;
  const contenido = data.contenido ?? existing.contenido;
  const categoria = data.categoria ?? existing.categoria;

  const [row] = await sql`
    UPDATE documento
    SET titulo = ${titulo},
        contenido = ${contenido},
        categoria = ${categoria}
    WHERE key = ${key}
    RETURNING id, key, titulo, contenido, categoria, idioma, creado_por, created_at, updated_at
  `;
  return (row as unknown as Documento) || null;
}

export async function deleteDocumento(key: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM documento WHERE key = ${key}
  `;
  return result.count !== undefined && result.count > 0;
}