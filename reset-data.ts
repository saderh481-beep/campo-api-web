/**
 * Script para eliminar todos los datos de la base de datos
 * SIN eliminar las tablas (solo TRUNCATE de los datos)
 * 
 * ADVERTENCIA: Este script elimina TODOS los datos de forma irreversible.
 * Ejecutar con: bun run reset-data
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

const sql = postgres(url, { max: 1 });

async function resetData() {
  console.log("⚠️  ADVERTENCIA: Se eliminarán TODOS los datos de la base de datos.");
  console.log("   Las tablas NO serán eliminadas.\n");

  const tablas = [
    "pdf_versiones",
    "notificaciones",
    "documentos",
    "beneficiario_cadenas",
    "asignaciones_beneficiario",
    "asignaciones_actividad",
    "bitacoras",
    "archive_logs",
    "auth_logs",
    "tecnico_detalles",
    "beneficiarios",
    "configuraciones",
    "documentos_pdf",
    "documentos_plantilla",
    "localidades",
    "zonas",
    "cadenas_productivas",
    "actividades",
    "usuarios",
    "_migraciones",
  ];

  try {
    console.log("Iniciando truncate de tablas...\n");

    for (const tabla of tablas) {
      try {
        await sql`TRUNCATE TABLE ${sql(tabla)} RESTART IDENTITY CASCADE`;
        console.log(`✓ ${tabla}`);
      } catch (err: any) {
        console.log(`✗ ${tabla}: ${err.message}`);
      }
    }

    console.log("\n✓ Datos eliminados correctamente.");
    console.log("  Las tablas siguen existiendo con estructura intacta.");

  } catch (err) {
    console.error("Error durante el proceso:", err);
  } finally {
    await sql.end();
  }
}

resetData();