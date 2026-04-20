import { hashSHA512 } from "./src/lib/crypto-utils";

type SeedUser = {
  correo: string;
  nombre: string;
  rol: "admin" | "coordinador" | "tecnico";
  codigo: string;
};

const seedUsers: SeedUser[] = [
  {
    correo: process.env.ADMIN_EMAIL ?? "admin@campo.local",
    nombre: process.env.ADMIN_NAME ?? "Administrador General",
    rol: "admin",
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

    // 1. Crear usuarios
    for (const user of seedUsers) {
      const hashedCodigo = hashSHA512(user.codigo);
      const [row] = await sql`
        INSERT INTO usuarios (correo, nombre, rol, codigo_acceso, hash_codigo_acceso)
        VALUES (${user.correo}, ${user.nombre}, ${user.rol}, ${user.codigo}, ${hashedCodigo})
        ON CONFLICT (correo)
        DO UPDATE SET
          nombre = EXCLUDED.nombre,
          rol = EXCLUDED.rol,
          codigo_acceso = EXCLUDED.codigo_acceso,
          hash_codigo_acceso = EXCLUDED.hash_codigo_acceso
        RETURNING id, correo, rol
      `;

      upserted.push({ correo: row.correo, rol: row.rol, codigo: user.codigo, id: row.id });
      console.log(`OK ${row.rol}: ${row.correo}`);
    }

    // 2. Obtener IDs
    const admin = upserted.find(u => u.rol === "admin");
    const coordinator = upserted.find(u => u.rol === "coordinador");
    const tecnicos = upserted.filter(u => u.rol === "tecnico");

    if (!admin || !coordinator) {
      throw new Error("No se encontraron admin o coordinador");
    }

    // 3. Crear tecnico_detalles para cada técnico y asignar al coordinador
    for (const tecnico of tecnicos) {
      const fechaLimite = new Date();
      fechaLimite.setFullYear(fechaLimite.getFullYear() + 1);

      await sql`
        INSERT INTO tecnico_detalles (tecnico_id, coordinador_id, fecha_limite, estado_corte, activo)
        VALUES (${tecnico.id}, ${coordinator.id}, ${fechaLimite.toISOString()}, 'en_servicio', true)
        ON CONFLICT (tecnico_id)
        DO UPDATE SET
          coordinador_id = EXCLUDED.coordinador_id,
          fecha_limite = EXCLUDED.fecha_limite,
          estado_corte = 'en_servicio',
          activo = true
      `;
      console.log(`OK tecnico_detalles: ${tecnico.correo} -> coordinador ${coordinator.correo}`);
    }

    console.log("\nUsuarios base listos:");
    for (const row of upserted) {
      console.log(`- ${row.rol}: ${row.correo} -> ${row.codigo}`);
    }

    console.log("\nAsignaciones coordinador-técnico creadas:");
    for (const t of tecnicos) {
      console.log(`- ${t.correo} -> coordinador ${coordinator.correo}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error inesperado:", error);
    process.exit(1);
  }
}

main();
