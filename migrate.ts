/**
 * Script de migraciones — ejecutar con:
 *   bun run migrate
 *
 * Lee todos los archivos .sql de la carpeta migrations/ en orden
 * y los ejecuta contra DATABASE_DIRECT_URL (o DATABASE_URL).
 * Carga automáticamente el archivo .env si existe.
 */

import postgres from "postgres";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Directorio del script (funciona con bun run migrate.ts desde cualquier cwd)
const __dirname = dirname(fileURLToPath(import.meta.url));

// Cargar .env si existe (Bun lo hace automáticamente, pero por compatibilidad lo cargamos manual si no)
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

// Tabla interna para llevar registro de migraciones ya aplicadas
await sql`
  CREATE TABLE IF NOT EXISTS _migraciones (
    nombre     TEXT        PRIMARY KEY,
    aplicada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

const migracionesDir = join(__dirname, "migrations");
const archivos = readdirSync(migracionesDir)
  .filter((f: string) => f.endsWith(".sql"))
  .sort();

if (archivos.length === 0) {
  console.log("No hay archivos .sql en migrations/");
  await sql.end();
  process.exit(0);
}

for (const archivo of archivos) {
  // Verificar si ya fue aplicada
  const [ya] = await sql`
    SELECT nombre FROM _migraciones WHERE nombre = ${archivo}
  `;
  if (ya) {
    console.log(`⏭  ${archivo} — ya aplicada, omitida`);
    continue;
  }

  const contenido = readFileSync(join(migracionesDir, archivo), "utf-8");
  console.log(`▶  Aplicando ${archivo}...`);

  try {
    await sql.unsafe(contenido);
    await sql`INSERT INTO _migraciones (nombre) VALUES (${archivo})`;
    console.log(`✓  ${archivo} — OK`);
  } catch (err) {
    console.error(`✗  ${archivo} — ERROR:`);
    console.error(err);
    await sql.end();
    process.exit(1);
  }
}

console.log("\nMigraciones completadas.");
await sql.end();
