import { hash } from "bcryptjs";
import { randomInt } from "node:crypto";

const adminEmail = process.env.ADMIN_EMAIL ?? "admin@campo.com";
const adminName = process.env.ADMIN_NAME ?? "Administrador";

async function main() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL no esta configurado");
    }

    // Cargar modulos despues de validar env para evitar inicializacion con valores incorrectos.
    const { sql } = await import("./src/db");

    console.log(`🔍 Verificando si existe el usuario ${adminEmail}...`);

    // Generar codigo_acceso de 6 digitos
    const codigoAcceso = randomInt(100000, 1000000).toString();
    const hashedCodigoAcceso = await hash(codigoAcceso, 12);

    // Verificar si el usuario ya existe
    const [existingUser] = await sql`
      SELECT id, nombre, rol FROM usuarios WHERE correo = ${adminEmail}
    `;

    let userId: number;
    if (existingUser) {
      console.log(`✅ Usuario ${adminEmail} ya existe con ID: ${existingUser.id}. Actualizando código de acceso...`);
      const [updated] = await sql`
        UPDATE usuarios
        SET codigo_acceso = ${codigoAcceso}, hash_codigo_acceso = ${hashedCodigoAcceso}, activo = true
        WHERE correo = ${adminEmail}
        RETURNING id
      `;
      userId = updated.id;
    } else {
      console.log(`👤 Creando nuevo usuario administrador: ${adminEmail}`);

      const [newUser] = await sql`
        INSERT INTO usuarios (correo, nombre, rol, codigo_acceso, hash_codigo_acceso, activo)
        VALUES (${adminEmail}, ${adminName}, 'administrador', ${codigoAcceso}, ${hashedCodigoAcceso}, true)
        RETURNING id
      `;
      userId = newUser.id;
      console.log(`✅ Usuario creado con ID: ${userId}`);
    }

    console.log(`
🎉 ¡Éxito! 
👉 Código de acceso: ${codigoAcceso}
👉 Para autenticarse, envíe una petición POST a /auth/login con:
   {
     "correo": "${adminEmail}",
     "codigo_acceso": "${codigoAcceso}"
   }
👉 Recibirá un token de sesión para acceder a rutas protegidas
`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error inesperado:", error);
    process.exit(1);
  }
}

main();