# Script para crear usuario admin y obtener codigo_acceso

## Descripción
Este script crea un usuario administrador en el sistema y genera un codigo_acceso de un solo uso para autenticarse inicialmente.

## Requisitos
- Node.js/Bun instalado
- Acceso a la base de datos PostgreSQL y Redis proporcionadas
- Las dependencias del proyecto instaladas (`bun install`)

## Variables de entorno
El script configura automáticamente las siguientes variables de entorno:
- `DATABASE_URL`: postgresql://postgres:UWhGVarVKUDkrJQWaWWvQhieBauYQTZA@ballast.proxy.rlwy.net:55528/railway
- `REDIS_URL`: redis://default:SdekIELQIOJNBXLIUXHgDfHQhfqSwgqU@mainline.proxy.rlwy.net:26908
- `NODE_ENV`: development

## Uso
1. Asegúrese de estar en el directorio raíz del proyecto
2. Ejecute: `bun run create-admin.ts`
3. El script mostrará:
   - Confirmación de creación del usuario admin (o notificación si ya existe)
   - El código OTP de acceso
   - Instrucciones para usar el código

## Codigo de acceso
El codigo de acceso es de 6 digitos, se muestra en la salida del script y expira en 10 minutos (600 segundos).

Para usar el código:
1. Copie el codigo mostrado en la salida
2. Envie una peticion POST a `/auth/verify-codigo-acceso` con:
   ```json
   {
     "correo": "admin@campo.com",
       "codigo_acceso": "EL_CODIGO_AQUI"
   }
   ```
3. Recibirá una cookie de sesión que puede usar para acceder a las rutas protegidas

## Notas importantes
- El script usa el correo `admin@campo.com` para el usuario admin
- Si el usuario ya existe, el script aun generara un nuevo codigo para ese correo
- El codigo se almacena en Redis y se elimina despues de su primer uso exitoso
- Para crear técnicos, beneficiarios y actividades asociados, se requieren scripts adicionales que interactúen con las tablas correspondientes del esquema de base de datos

## Solución de problemas
Si ve errores de conexión:
1. Verifique que tenga acceso de red a los servidores de base de datos y Redis
2. Confirme que las credenciales proporcionadas sean correctas
3. Asegúrese de que no haya firewalls bloqueando las conexiones
4. Los URLs proporcionados son de Railway y pueden requerir estar dentro de su red o tener configuración especial

## Personalización
Para cambiar el correo o nombre del admin, modifique las variables:
- `adminEmail`
- `adminName`
en el script `create-admin.ts`.