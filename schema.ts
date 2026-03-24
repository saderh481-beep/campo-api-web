/**
 * Script de inspección de esquema — ejecutar con:
 *   bun run schema
 *
 * Muestra todas las tablas del schema público con sus columnas,
 * tipos, nulabilidad, defaults e índices.
 * Carga automáticamente el archivo .env si existe.
 */

import postgres from "postgres";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = join(__dirname, ".env");
if (existsSync(envPath) && !process.env.DATABASE_URL && !process.env.DATABASE_DIRECT_URL) {
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: Define DATABASE_DIRECT_URL o DATABASE_URL en tu .env");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });

// ── Obtener todas las tablas del schema público ──────────────────────────────
const tablas = await sql<{ table_name: string; row_estimate: number }[]>`
  SELECT
    t.table_name,
    COALESCE(s.n_live_tup, 0)::int AS row_estimate
  FROM information_schema.tables t
  LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
  WHERE t.table_schema = 'public'
    AND t.table_type  = 'BASE TABLE'
  ORDER BY t.table_name
`;

if (tablas.length === 0) {
  console.log("No hay tablas en el schema público.");
  await sql.end();
  process.exit(0);
}

// ── Obtener columnas de todas las tablas en una sola query ───────────────────
const columnas: any[] = await sql`
  SELECT
    table_name,
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default,
    ordinal_position
  FROM information_schema.columns
  WHERE table_schema = 'public'
  ORDER BY table_name, ordinal_position
`;

// ── Obtener índices ──────────────────────────────────────────────────────────
const indices: any[] = await sql`
  SELECT
    t.relname  AS table_name,
    i.relname  AS index_name,
    pg_get_indexdef(ix.indexrelid) AS index_def
  FROM pg_index ix
  JOIN pg_class t ON t.oid = ix.indrelid
  JOIN pg_class i ON i.oid = ix.indexrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND NOT ix.indisprimary
  ORDER BY t.relname, i.relname
`;

// ── Obtener foreign keys ─────────────────────────────────────────────────────
const fks: any[] = await sql`
  SELECT
    kcu.table_name,
    kcu.column_name,
    ccu.table_name  AS foreign_table,
    ccu.column_name AS foreign_column,
    tc.constraint_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema    = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
   AND ccu.table_schema    = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema    = 'public'
  ORDER BY kcu.table_name, kcu.column_name
`;

// ── Agrupar por tabla ────────────────────────────────────────────────────────
const columnasPorTabla = new Map<string, typeof columnas>();
for (const col of columnas) {
  if (!columnasPorTabla.has(col.table_name)) columnasPorTabla.set(col.table_name, []);
  columnasPorTabla.get(col.table_name)!.push(col);
}

const indicesPorTabla = new Map<string, typeof indices>();
for (const idx of indices) {
  if (!indicesPorTabla.has(idx.table_name)) indicesPorTabla.set(idx.table_name, []);
  indicesPorTabla.get(idx.table_name)!.push(idx);
}

const fksPorTabla = new Map<string, typeof fks>();
for (const fk of fks) {
  if (!fksPorTabla.has(fk.table_name)) fksPorTabla.set(fk.table_name, []);
  fksPorTabla.get(fk.table_name)!.push(fk);
}

// ── Renderizar ───────────────────────────────────────────────────────────────
const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const CYAN   = "\x1b[36m";
const YELLOW = "\x1b[33m";
const GREEN  = "\x1b[32m";
const DIM    = "\x1b[2m";
const BLUE   = "\x1b[34m";

function tipoCorto(col: typeof columnas[0]): string {
  const base = col.data_type === "USER-DEFINED"  ? col.udt_name
             : col.data_type === "character varying" ? `varchar`
             : col.data_type === "timestamp with time zone" ? "timestamptz"
             : col.data_type === "timestamp without time zone" ? "timestamp"
             : col.data_type;
  return base;
}

console.log(`\n${BOLD}${CYAN}━━━ ESQUEMA DE BASE DE DATOS ━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
console.log(`${DIM}${tablas.length} tabla(s) encontrada(s) en schema público${RESET}\n`);

for (const tabla of tablas) {
  const cols  = columnasPorTabla.get(tabla.table_name) ?? [];
  const idxs  = indicesPorTabla.get(tabla.table_name) ?? [];
  const tfks  = fksPorTabla.get(tabla.table_name) ?? [];

  console.log(`${BOLD}${YELLOW}▸ ${tabla.table_name}${RESET} ${DIM}(~${tabla.row_estimate} filas)${RESET}`);

  // Columnas
  const maxCol  = Math.max(...cols.map((c) => c.column_name.length), 6);
  const maxTipo = Math.max(...cols.map((c) => tipoCorto(c).length), 4);

  for (const col of cols) {
    const nullable = col.is_nullable === "YES" ? `${DIM}NULL${RESET}` : `${GREEN}NOT NULL${RESET}`;
    const def      = col.column_default
      ? ` ${DIM}DEFAULT ${col.column_default.replace(/::[\w\s]+/g, "")}${RESET}`
      : "";
    const fk = tfks.find((f) => f.column_name === col.column_name);
    const fkStr = fk ? ` ${BLUE}→ ${fk.foreign_table}.${fk.foreign_column}${RESET}` : "";
    console.log(
      `  ${col.column_name.padEnd(maxCol)}  ${CYAN}${tipoCorto(col).padEnd(maxTipo)}${RESET}  ${nullable}${def}${fkStr}`
    );
  }

  // Índices
  if (idxs.length > 0) {
    console.log(`  ${DIM}── índices ──────────────────────────────${RESET}`);
    for (const idx of idxs) {
      console.log(`  ${DIM}${idx.index_name}: ${idx.index_def}${RESET}`);
    }
  }

  console.log();
}

await sql.end();
