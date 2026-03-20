import { hash } from "bcryptjs";

const adminEmail = process.env.ADMIN_EMAIL ?? "admin@campo.com";
const adminName = process.env.ADMIN_NAME ?? "Administrador";
const CODIGO_ACCESO_TTL = Number(process.env.CODIGO_ACCESO_TTL ?? 600);

async function main() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL no esta configurado");
    }
    if (!process.env.REDIS_URL && !process.env.REDIS_PUBLIC_URL) {
      throw new Error("REDIS_URL o REDIS_PUBLIC_URL no esta configurado");
    }

    // Cargar modulos despues de validar env para evitar inicializacion con valores incorrectos.
    const [{ sql }, { redis }, { enviarCodigoAcceso }] = await Promise.all([
      import("./src/db"),
      import("./src/lib/redis"),
      import("./src/lib/mailer"),
    ]);

    console.log(`🔍 Verificando si existe el usuario ${adminEmail}...`);

    // Verificar si el usuario ya existe
    const [existingUser] = await sql`
      SELECT id, nombre, rol FROM usuarios WHERE correo = ${adminEmail} AND activo = true
    `;

    let userId: number;
    if (existingUser) {
      console.log(`✅ Usuario ${adminEmail} ya existe con ID: ${existingUser.id}`);
      userId = existingUser.id;
    } else {
      console.log(`👤 Creando nuevo usuario administrador: ${adminEmail}`);

      // Insertar el nuevo usuario
      const [newUser] = await sql`
        INSERT INTO usuarios (correo, nombre, rol, activo)
        VALUES (${adminEmail}, ${adminName}, 'admin', true)
        RETURNING id
      `;
      userId = newUser.id;
      console.log(`✅ Usuario creado con ID: ${userId}`);
    }

    // Generar codigo_acceso de 6 digitos
    const codigoAcceso = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCodigoAcceso = await hash(codigoAcceso, 10);

    // Almacenar codigo_acceso en Redis (eliminando cualquier valor previo)
    await redis.del(`otp:${adminEmail}`);
    await redis.del(`codigo_acceso:${adminEmail}`);
    await redis.setex(`codigo_acceso:${adminEmail}`, CODIGO_ACCESO_TTL, hashedCodigoAcceso);
    // También limpiar contadores de fallos y bloqueos
    await redis.del(`fail:${adminEmail}`);
    await redis.del(`block:${adminEmail}`);

    // Enviar codigo_acceso por correo
    try {
      await enviarCodigoAcceso(adminEmail, codigoAcceso);
      console.log(`📧 Código de acceso enviado a ${adminEmail}`);
    } catch (emailError) {
      console.error("❌ Error al enviar el correo de código de acceso:", emailError);
      console.log("💡 El código generado es:", codigoAcceso);
    }

    console.log(`
🎉 ¡Éxito! 
👉 Código de acceso: ${codigoAcceso}
👉 Este código expira en ${CODIGO_ACCESO_TTL} segundos (10 minutos)
👉 Para usarlo, envíe una petición POST a /auth/verify-codigo-acceso con:
   {
     "correo": "${adminEmail}",
     "codigo_acceso": "${codigoAcceso}"
   }
👉 Recibirá una cookie de sesión para acceder a rutas protegidas
`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error inesperado:", error);
    process.exit(1);
  }
}

main();