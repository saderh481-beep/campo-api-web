import { hash } from "bcryptjs";

type SeedUser = {
  correo: string;
  nombre: string;
  rol: "administrador" | "coordinador" | "tecnico";
  codigo: string;
};

const seedUsers: SeedUser[] = [
  {
    correo: process.env.ADMIN_EMAIL ?? "admin@campo.local",
    nombre: process.env.ADMIN_NAME ?? "Administrador General",
    rol: "administrador",
    codigo: process.env.ADMIN_CODIGO ?? "654321",
  },
  {
    correo: process.env.COORD_EMAIL ?? "coordinador@campo.local",
    nombre: process.env.COORD_NAME ?? "Coordinador Base",
    rol: "coordinador",
    codigo: process.env.COORD_CODIGO ?? "654322",
  },
  {
    correo: process.env.TECNICO1_EMAIL ?? "tecnico1@campo.local",
    nombre: process.env.TECNICO1_NAME ?? "Tecnico 1",
    rol: "tecnico",
    codigo: process.env.TECNICO1_CODIGO ?? "12345",
  },
  {
    correo: process.env.TECNICO2_EMAIL ?? "tecnico2@campo.local",
    nombre: process.env.TECNICO2_NAME ?? "Tecnico 2",
    rol: "tecnico",
    codigo: process.env.TECNICO2_CODIGO ?? "12346",
  },
  {
    correo: process.env.TECNICO3_EMAIL ?? "tecnico3@campo.local",
    nombre: process.env.TECNICO3_NAME ?? "Tecnico 3",
    rol: "tecnico",
    codigo: process.env.TECNICO3_CODIGO ?? "12347",
  },
];

async function main() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL no esta configurado");
    }

    const { sql } = await import("./src/db");

    const upserted: Array<{ correo: string; rol: string; codigo: string; id: string }> = [];

    for (const user of seedUsers) {
      const hashedCodigo = await hash(user.codigo, 12);
      const [row] = await sql`
        INSERT INTO usuarios (correo, nombre, rol, codigo_acceso, hash_codigo_acceso, activo)
        VALUES (${user.correo}, ${user.nombre}, ${user.rol}, ${user.codigo}, ${hashedCodigo}, true)
        ON CONFLICT (correo)
        DO UPDATE SET
          nombre = EXCLUDED.nombre,
          rol = EXCLUDED.rol,
          codigo_acceso = EXCLUDED.codigo_acceso,
          hash_codigo_acceso = EXCLUDED.hash_codigo_acceso,
          activo = true,
          updated_at = NOW()
        RETURNING id, correo, rol
      `;

      upserted.push({ correo: row.correo, rol: row.rol, codigo: user.codigo, id: row.id });
      console.log(`OK ${row.rol}: ${row.correo}`);
    }

    console.log("Nota: este script solo crea usuarios base. La asignacion coordinador-tecnico y fecha limite se gestionan en el flujo de asignaciones.");

    console.log("\nUsuarios base listos:");
    for (const row of upserted) {
      console.log(`- ${row.rol}: ${row.correo} -> ${row.codigo}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error inesperado:", error);
    process.exit(1);
  }
}

main();
