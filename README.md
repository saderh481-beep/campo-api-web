# API Web - Endpoints

Documentacion actualizada de endpoints expuestos por la API.

## Base
- Health: GET /health
- Health versionado: GET /api/v1/health
- Prefijos montados:
  - /api/v1/auth
  - /api/v1/usuarios
  - /api/v1/tecnicos
  - /api/v1/cadenas-productivas
  - /api/v1/actividades
  - /api/v1/beneficiarios
  - /api/v1/asignaciones
  - /api/v1/bitacoras
  - /api/v1/reportes
  - /api/v1/archive
  - /api/v1/notificaciones
  - /api/v1/localidades
  - /api/v1/configuraciones
  - /api/v1/documentos-plantilla

## Autenticacion

Todas las rutas protegidas usan header Authorization con esquema Bearer.

Authorization: Bearer <token>

El token se valida contra Redis en la clave session:{token}.

Nota: Redis se usa para sesiones web. Los codigos de acceso de usuarios/tecnicos se guardan en base de datos (usuarios.codigo_acceso + usuarios.hash_codigo_acceso).

## Roles

Roles usados por el backend:
- administrador
- coordinador
- tecnico

## Estado de corte (tecnicos)

Nota: La informacion de tecnicos ahora vive en `usuarios` con `rol = 'tecnico'`.

Los tecnicos tienen un campo `estado_corte` con tres valores posibles:
- `en_servicio` — activo, puede iniciar sesion.
- `corte_aplicado` — periodo vencido, bloqueado en login y en cada request.
- `baja` — dado de baja definitiva.

Logica de bloqueo:
- El corte se determina con `configuraciones.fecha_corte_global.valor.fecha` (no por `fecha_limite` individual).
- En cada request: el middleware valida la fecha de corte global cargada en sesion.
- En login: si la fecha de corte global ya vencio, se actualiza `estado_corte = corte_aplicado` y se rechaza con `401 { error: "periodo_vencido" }`.
- Si no existe fecha de corte global configurada, login de tecnicos responde `401 { error: "periodo_no_configurado" }`.

## Scripts de utilidad

```bash
# Aplicar migraciones pendientes a la base de datos
bun run migrate

# Crear/actualizar usuarios base (1 admin, 1 coordinador, 3 tecnicos)
bun run create-users.ts
# o por npm script
npm run seed:usuarios

# Inspeccionar estructura actual de todas las tablas en la BD
bun run schema

# Verificar tipos TypeScript sin compilar
bun run typecheck
```

## Novedades recientes

- Asignaciones: se documenta y expone el CRUD completo por relacion en un solo modulo: coordinador -> tecnico, tecnico -> beneficiario y tecnico -> actividad, incluyendo `GET /asignaciones/coordinador-tecnico/:tecnico_id`.
- Tecnicos: `POST /tecnicos` se mantiene como ruta no soportada y responde `405`, dejando explicito que el alta real ocurre en `POST /usuarios` con `rol=tecnico`.
- Bitacoras y notificaciones: las rutas con `:id` ahora validan UUID en params y responden `422` cuando el identificador es invalido.
- API docs: `API_ENDPOINTS.md` se sincronizo con rutas nuevas, errores `422` de validacion y codigos HTTP corregidos.
- Beneficiarios: se agrego soporte completo de `localidad_id` en `GET /beneficiarios`, `POST /beneficiarios` y `PATCH /beneficiarios/:id`.
- Beneficiarios: el alcance para coordinador en listado, detalle y documentos ahora se determina por `beneficiarios.tecnico_id` + `tecnico_detalles.coordinador_id`.
- Beneficiarios: al crear o reasignar un beneficiario se sincroniza tambien `asignaciones_beneficiario` para mantener consistencia con modulos de tecnicos/asignaciones.
- Beneficiarios: `telefono_principal` y `telefono_secundario` se almacenan como `TEXT` normalizado, no como binario.
- Usuarios (PATCH): `hash_codigo_acceso` solo se recalcula cuando se envia `codigo_acceso` nuevo.
- Archive: `POST /archive/:periodo/confirmar` ahora actualiza el registro mas reciente del periodo (no inserta un duplicado).
- Archive: `POST /archive/:periodo/forzar` retorna `409` si ya existe un archivado en progreso para ese periodo.
- Notificaciones: accesibles para administrador y tecnico autenticados, siempre filtradas por `destino_id`.
- Actividades (PATCH): `created_by` ya no es editable desde API.
- Usuarios (PATCH): se agrego campo `activo` (boolean) — permite reactivar o desactivar un usuario desde el mismo endpoint PATCH. Desactivar un tecnico tambien marca su `tecnico_detalles` como inactivo con `estado_corte=baja`.
- Usuarios (POST): la validacion de correo duplicado ahora solo bloquea si existe otro usuario **activo** con ese correo (permite reutilizar correos de usuarios eliminados).
- Asignaciones (POST /beneficiario y POST /actividad): ahora validan que el tecnico y la entidad destino existan y esten activos antes de insertar. Errores: `400 tecnico invalido`, `404 beneficiario/actividad no encontrado`.
- Beneficiarios (POST y PATCH): la creacion y reasignacion de tecnico ahora ocurre en una transaccion atomica junto con `asignaciones_beneficiario`, eliminando posibles registros huerfanos.
- Beneficiarios: `GET /beneficiarios`, `GET /beneficiarios/:id` y endpoints de documentos/cadenas ahora operan solo sobre beneficiarios activos.
- Beneficiarios cadenas: `POST /beneficiarios/:id/cadenas` valida que todos los `cadena_ids` existan y esten activos (si no, responde `400`).
- Beneficiarios: se agrego `DELETE /beneficiarios/:id` (soft-delete) y al desactivar tambien se cierran asignaciones activas en `asignaciones_beneficiario`.
- Beneficiarios: `POST` y `PATCH` validan `localidad_id` contra localidades activas para evitar errores de FK en base de datos.
- Cadenas productivas y actividades: listados y operaciones de edicion/baja ahora se aplican solo a registros activos (soft-delete consistente).
- Localidades: `DELETE /localidades/:id` ahora bloquea con `409` si la localidad tiene beneficiarios activos referenciandola.
- Archive: rutas con `:periodo` ahora validan formato `YYYY-MM`; descarga agrega timeout y limite de tamano (puede responder `413`).
- Documentos PDF: `POST /documentos-pdf` ahora valida que el archivo sea PDF.
- Asignaciones: rutas de consulta/eliminacion por id agregan validacion UUID en params/query.

## Arranque rapido

```bash
# Instalar dependencias
bun install

# Aplicar migraciones
npm run migrate

# Crear usuarios base
npm run seed:usuarios

# Levantar API en modo desarrollo (watch)
bun run dev

# Ejecutar una corrida normal
bun run start
```

## Configuracion de entorno

1. Crear archivo `.env` en la raiz del proyecto.
2. Copiar variables desde `env.example` y ajustar valores reales por ambiente.
3. Validar conectividad de PostgreSQL y Redis antes de iniciar.

Variables clave:
- `DATABASE_URL` / `DATABASE_DIRECT_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `CLOUDINARY_*`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `PORT`, `WEB_ORIGIN`, `NODE_ENV`

Nota: `.env` ya esta ignorado por Git en `.gitignore`.

## Seed de usuarios base

El script `create-users.ts` realiza upsert idempotente sobre `usuarios` y crea/actualiza el detalle tecnico en `tecnico_detalles` (si la tabla existe).

Credenciales por defecto:
- administrador: admin@campo.local / 654321
- coordinador: coordinador@campo.local / 654322
- tecnico: tecnico1@campo.local / 12345
- tecnico: tecnico2@campo.local / 12346
- tecnico: tecnico3@campo.local / 12347

Variables de entorno opcionales para personalizar correos/nombres/codigos:
- `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_CODIGO`
- `COORD_EMAIL`, `COORD_NAME`, `COORD_CODIGO`
- `TECNICO1_EMAIL`, `TECNICO1_NAME`, `TECNICO1_CODIGO`
- `TECNICO2_EMAIL`, `TECNICO2_NAME`, `TECNICO2_CODIGO`
- `TECNICO3_EMAIL`, `TECNICO3_NAME`, `TECNICO3_CODIGO`

Compatibilidad: `create-admin.ts` sigue existiendo como alias y redirige a `create-users.ts`.

## Endpoints

Contrato recomendado para frontend (request/response/error por endpoint):

- Ver API_ENDPOINTS.md

Todas las rutas de esta seccion usan el prefijo base `/api/v1`.

## Tabla Rapida

### Auth

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| POST | /auth/request-codigo-acceso | Publico | { correo } |
| POST | /auth/verify-codigo-acceso | Publico | { correo, codigo_acceso } |
| POST | /auth/login | Publico | { correo, codigo_acceso } |
| POST | /auth/request-otp | Publico | { correo } |
| POST | /auth/verify-otp | Publico | { correo, codigo_acceso } |
| POST | /auth/logout | Bearer | - |

### Usuarios

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| GET | /usuarios | administrador | - |
| POST | /usuarios | administrador | { correo, nombre, rol, telefono? } |
| PATCH | /usuarios/:id | administrador | { nombre?, correo?, rol?, codigo_acceso?, telefono?, activo? } |
| DELETE | /usuarios/:id | administrador | - |

### Tecnicos

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| GET | /tecnicos | administrador, coordinador | - |
| GET | /tecnicos/:id | administrador, coordinador | - |
| POST | /tecnicos | administrador | No disponible (alta via /usuarios con rol tecnico) |
| PATCH | /tecnicos/:id | administrador | { nombre?, correo?, telefono?, coordinador_id?, fecha_limite? } |
| POST | /tecnicos/:id/codigo | administrador | - |
| POST | /tecnicos/aplicar-cortes | administrador | - |
| POST | /tecnicos/:id/cerrar-corte | administrador, coordinador | - |
| DELETE | /tecnicos/:id | administrador | - |

### Cadenas Productivas

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| GET | /cadenas-productivas | administrador, coordinador | - |
| POST | /cadenas-productivas | administrador | { nombre, descripcion? } |
| PATCH | /cadenas-productivas/:id | administrador | { nombre?, descripcion? } |
| DELETE | /cadenas-productivas/:id | administrador | - |

### Actividades

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| GET | /actividades | administrador, coordinador | - |
| POST | /actividades | administrador | { nombre, descripcion? } |
| PATCH | /actividades/:id | administrador | { nombre?, descripcion? } |
| DELETE | /actividades/:id | administrador | - |

### Beneficiarios

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| GET | /beneficiarios | administrador, coordinador | - |
| GET | /beneficiarios/:id | administrador, coordinador | - |
| POST | /beneficiarios | administrador, coordinador | { nombre, municipio, tecnico_id, localidad_id? } |
| PATCH | /beneficiarios/:id | administrador, coordinador | { nombre?, municipio?, localidad?, localidad_id?, direccion?, cp?, telefono_principal?, telefono_secundario?, coord_parcela?, tecnico_id? } |
| DELETE | /beneficiarios/:id | administrador, coordinador | - |
| POST | /beneficiarios/:id/cadenas | administrador | { cadena_ids: uuid[] } |
| POST | /beneficiarios/:id/documentos | administrador, coordinador | FormData(archivo, tipo) |
| GET | /beneficiarios/:id/documentos | administrador, coordinador | - |

### Asignaciones

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| GET | /asignaciones/coordinador-tecnico?tecnico_id=uuid | administrador | Query UUID requerido |
| GET | /asignaciones/coordinador-tecnico/lista | administrador | Query opcional: tecnico_id |
| GET | /asignaciones/coordinador-tecnico/:tecnico_id | administrador | - |
| POST | /asignaciones/coordinador-tecnico | administrador | { tecnico_id, coordinador_id, fecha_limite } |
| PATCH | /asignaciones/coordinador-tecnico/:tecnico_id | administrador | { coordinador_id?, fecha_limite?, activo? } |
| DELETE | /asignaciones/coordinador-tecnico/:tecnico_id | administrador | Param UUID requerido |
| GET | /asignaciones/beneficiario | administrador | Query opcional: tecnico_id, beneficiario_id, activo |
| GET | /asignaciones/beneficiario/:id | administrador | - |
| POST | /asignaciones/beneficiario | administrador | { tecnico_id, beneficiario_id } |
| PATCH | /asignaciones/beneficiario/:id | administrador | { tecnico_id?, beneficiario_id?, activo? } |
| DELETE | /asignaciones/beneficiario/:id | administrador | Param UUID requerido |
| GET | /asignaciones/actividad | administrador | Query opcional: tecnico_id, actividad_id, activo |
| GET | /asignaciones/actividad/:id | administrador | - |
| POST | /asignaciones/actividad | administrador | { tecnico_id, actividad_id } |
| PATCH | /asignaciones/actividad/:id | administrador | { tecnico_id?, actividad_id?, activo? } |
| DELETE | /asignaciones/actividad/:id | administrador | Param UUID requerido |

### Bitacoras

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| GET | /bitacoras | administrador, coordinador | Query opcional: tecnico_id, mes, anio, estado, tipo |
| GET | /bitacoras/:id | administrador, coordinador | - |
| PATCH | /bitacoras/:id | administrador, coordinador | { observaciones?, actividades_realizadas? } |
| PATCH | /bitacoras/:id/pdf-config | administrador, coordinador | { pdf_edicion: object } |
| GET | /bitacoras/:id/pdf | administrador, coordinador | - |
| GET | /bitacoras/:id/pdf/descargar | administrador, coordinador | - |
| POST | /bitacoras/:id/pdf/imprimir | administrador, coordinador | - |
| GET | /bitacoras/:id/versiones | administrador, coordinador | - |

### Reportes

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| GET | /reportes/mensual | administrador, coordinador | Query opcional: mes, anio |
| GET | /reportes/tecnico/:id | administrador, coordinador | Query opcional: desde, hasta |

### Notificaciones

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| GET | /notificaciones | administrador, tecnico | - |
| PATCH | /notificaciones/:id/leer | administrador, tecnico | - |
| PATCH | /notificaciones/leer-todas | administrador, tecnico | - |

### Localidades

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| GET | /localidades | administrador, coordinador | - |
| POST | /localidades | administrador | { municipio, nombre, cp? } |
| PATCH | /localidades/:id | administrador | { municipio?, nombre?, cp? } |
| DELETE | /localidades/:id | administrador | - (puede responder 409 si tiene beneficiarios activos) |

### Configuraciones

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| GET | /configuraciones | administrador | - |
| GET | /configuraciones/:clave | administrador, coordinador | - |
| PUT | /configuraciones/:clave | administrador | { valor: object } |

### Documentos Plantilla

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| GET | /documentos-plantilla/activos | administrador, coordinador | - |
| GET | /documentos-plantilla | administrador | - |
| POST | /documentos-plantilla | administrador | { nombre, descripcion?, obligatorio?, orden? } |
| PATCH | /documentos-plantilla/:id | administrador | { nombre?, descripcion?, obligatorio?, orden?, activo? } |
| DELETE | /documentos-plantilla/:id | administrador | - |

### Archive

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| GET | /archive | administrador | - |
| GET | /archive/:periodo/descargar | administrador | Param `periodo` formato YYYY-MM |
| POST | /archive/:periodo/confirmar | administrador | { confirmar: true } |
| POST | /archive/:periodo/forzar | administrador | Param `periodo` formato YYYY-MM |

### Zonas

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| GET | /zonas | administrador | - |
| POST | /zonas | administrador | { nombre } |
| PATCH | /zonas/:id | administrador | { nombre?, descripcion? } |
| DELETE | /zonas/:id | administrador | - |

### Documentos PDF

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| GET | /documentos-pdf | administrador | - |
| POST | /documentos-pdf | administrador | FormData(archivo PDF, clave, nombre, descripcion?) |
| PATCH | /documentos-pdf/:id | administrador | { clave?, nombre?, descripcion?, activo? } |
| DELETE | /documentos-pdf/:id | administrador | - |

### Dashboard

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| GET | /dashboard/coordinador | coordinador | - |

### Auth (/auth)

- POST /request-codigo-acceso
  - Body: { correo }
  - Nota: endpoint informativo/compatibilidad; ya no genera codigo por correo.
  - Respuestas:
    - 200: { message }

- POST /verify-codigo-acceso
  - Body: { correo, codigo_acceso }
  - Login por compatibilidad.
  - Respuestas:
    - 200: { token, usuario }
    - 401: { error: "Credenciales invalidas" | "periodo_vencido" | "periodo_no_configurado" }

- POST /login
  - Body: { correo, codigo_acceso }
  - Busca usuario activo por correo, compara con hash_codigo_acceso (bcrypt), crea token UUID, guarda sesion en Redis y registra auth_logs login.
  - Respuesta 200:
    - { token, usuario: { id, nombre, correo, rol } }
  - Respuestas:
    - 200: { token, usuario }
    - 401: { error: "Credenciales invalidas" | "periodo_vencido" | "periodo_no_configurado" }

- POST /request-otp
  - Compatibilidad temporal (mismo comportamiento de request-codigo-acceso).
  - Respuestas:
    - 200: { message }

- POST /verify-otp
  - Compatibilidad temporal (mismo comportamiento de login).
  - Respuestas:
    - 200: { token, usuario }
    - 401: { error: "Credenciales invalidas" | "periodo_vencido" | "periodo_no_configurado" }

- POST /logout
  - Requiere Bearer token.
  - Elimina session:{token} en Redis y registra auth_logs logout.
  - Respuestas:
    - 200: { message: "Sesion cerrada" }
    - 401: { error }

### Usuarios (/usuarios)

Requiere rol administrador.

- GET /
  - Lista usuarios (incluye codigo_acceso).
  - Respuestas:
    - 200: Usuario[]

- POST /
  - Body:
    - correo (email)
    - nombre
    - rol: tecnico | coordinador | administrador
    - telefono? (solo tecnico)
  - Crea usuario y genera automaticamente codigo_acceso:
    - tecnico: 5 digitos
    - coordinador/administrador: 6 digitos
  - Guarda codigo_acceso en texto plano y hash_codigo_acceso en bcrypt cost 12.
  - Si rol=tecnico, crea usuario con rol tecnico y su detalle en tecnico_detalles.
  - Respuesta 201 incluye codigo_acceso.
  - Respuestas:
    - 201: Usuario
    - 409: { error: "El correo ya está registrado" }

- PATCH /:id
  - Body parcial: nombre, correo, rol, codigo_acceso, telefono.
  - Si se actualiza codigo_acceso, tambien se actualiza hash_codigo_acceso.
  - Si no se envia codigo_acceso, se conserva el hash actual sin recalcular.
  - Valida correo unico entre usuarios activos.
  - El flujo de asignacion de coordinador y fecha limite de tecnico se realiza en /asignaciones/coordinador-tecnico.
  - Respuestas:
    - 200: Usuario
    - 400: { error }
    - 404: { error: "Usuario no encontrado" }
    - 409: { error: "El correo ya está registrado" }

- DELETE /:id
  - Soft delete: activo=false, updated_at=NOW().
  - Retorna 404 si el usuario no existe.
  - Si el usuario tiene rol=tecnico, tambien desactiva su registro en tecnico_detalles.
  - Respuestas:
    - 200: { message: "Usuario desactivado" }
    - 400: { error: "No puedes desactivar tu propia cuenta" }
    - 404: { error: "Usuario no encontrado" }

### Tecnicos (/tecnicos)

Requiere autenticacion.

- GET /
  - Roles: administrador, coordinador.
  - Admin ve todos los activos; coordinador solo los suyos.
  - Respuestas:
    - 200: Tecnico[]

- GET /:id
  - Roles: administrador, coordinador.
  - Respuestas:
    - 200: TecnicoDetalle
    - 403: { error: "Sin permisos" }
    - 404: { error: "Técnico no encontrado" }

- POST /
  - Solo administrador.
  - No disponible para crear tecnicos.
  - La alta de tecnicos se realiza en /usuarios con rol=tecnico.
  - Respuestas:
    - 409: { error }

- PATCH /:id
  - Solo administrador.
  - Body parcial: nombre, correo, telefono, coordinador_id, fecha_limite.
  - Valida correo unico contra usuarios activos.
  - Si cambia coordinador_id, valida que sea un coordinador activo.
  - Sincroniza nombre/correo en la tabla usuarios para mantener consistencia.
  - La fecha de corte efectiva se toma desde configuraciones.fecha_corte_global.
  - Respuestas:
    - 200: Tecnico
    - 400: { error }
    - 404: { error: "Técnico no encontrado" }
    - 409: { error: "El correo ya está registrado" }

- POST /aplicar-cortes
  - Solo administrador.
  - Aplica estado_corte=corte_aplicado a tecnicos cuando la fecha_corte_global ya vencio.
  - Respuesta: lista de tecnicos actualizados.
  - Respuestas:
    - 200: { message, tecnicos }

- POST /:id/cerrar-corte
  - Roles: administrador, coordinador.
  - Coordinador solo puede cerrar tecnicos bajo su coordinacion.
  - Aplica estado_corte=corte_aplicado al tecnico indicado.
  - Respuestas:
    - 200: { message, tecnico }
    - 403: { error: "Sin permisos sobre este técnico" }
    - 404: { error: "Técnico no encontrado" }

- POST /:id/codigo
  - Solo administrador.
  - Genera codigo numerico de 5 digitos para tecnico.
  - Lo guarda en usuarios.codigo_acceso, actualizando usuarios.hash_codigo_acceso.
  - No usa Redis para codigos tecnicos.
  - Respuestas:
    - 200: { message, codigo }
    - 404: { error: "Técnico no encontrado" }

- DELETE /:id
  - Solo administrador.
  - Soft delete tecnico: activo=false, updated_at=NOW().
  - Tambien desactiva el detalle tecnico asociado en tecnico_detalles.
  - Retorna 404 si el técnico no existe.
  - Respuestas:
    - 200: { message: "Técnico desactivado" }
    - 404: { error: "Técnico no encontrado" }

### Cadenas Productivas (/cadenas-productivas)

- GET /
  - Roles: administrador, coordinador.
  - Respuestas:
    - 200: Cadena[]

- POST /
  - Solo administrador.
  - Body: nombre, descripcion?.
  - Respuestas:
    - 201: Cadena

- PATCH /:id
  - Solo administrador.
  - Body parcial: nombre, descripcion.
  - Respuestas:
    - 200: Cadena
    - 404: { error: "Cadena no encontrada" }

- DELETE /:id
  - Solo administrador.
  - Soft delete: activo=false, updated_at=NOW().
  - Retorna 404 si la cadena no existe.
  - Respuestas:
    - 200: { message }
    - 404: { error: "Cadena no encontrada" }

### Actividades (/actividades)

- GET /
  - Roles: administrador, coordinador.
  - Respuestas:
    - 200: Actividad[]

- POST /
  - Solo administrador.
  - Body: nombre, descripcion?.
  - Respuestas:
    - 201: Actividad

- PATCH /:id
  - Solo administrador.
  - Body parcial: nombre, descripcion.
  - Respuestas:
    - 200: Actividad
    - 404: { error: "Actividad no encontrada" }

- DELETE /:id
  - Solo administrador.
  - Soft delete: activo=false, updated_at=NOW().
  - Retorna 404 si la actividad no existe.
  - Respuestas:
    - 200: { message }
    - 404: { error: "Actividad no encontrada" }

### Beneficiarios (/beneficiarios)

- GET /
  - Roles: administrador, coordinador.
  - Administrador ve todos los beneficiarios.
  - Coordinador solo ve beneficiarios cuyo `tecnico_id` pertenece a un tecnico activo bajo su coordinacion.
  - Respuestas:
    - 200: Beneficiario[]

- GET /:id
  - Roles: administrador, coordinador.
  - Regresa beneficiario con cadenas activas y documentos.
  - Coordinador solo puede consultar beneficiarios de sus tecnicos.
  - Respuestas:
    - 200: BeneficiarioDetalle
    - 404: { error: "Beneficiario no encontrado" }

- POST /
  - Roles: administrador, coordinador.
  - Body:
    - nombre
    - municipio
    - localidad?
    - localidad_id? (uuid FK a tabla localidades)
    - direccion?
    - cp?
    - telefono_principal?
    - telefono_secundario?
    - coord_parcela? (formato x,y o (x,y))
    - tecnico_id
  - telefonos se almacenan como texto normalizado (`TEXT`).
  - coord_parcela se almacena como point.
  - Si la creacion es exitosa, tambien se crea la asignacion activa correspondiente en `asignaciones_beneficiario`.
  - Respuestas:
    - 201: Beneficiario
    - 400: { error }
    - 403: { error: "Sin permisos para asignar este técnico" }

- PATCH /:id
  - Roles: administrador, coordinador.
  - Body parcial de los mismos campos incluyendo localidad_id.
  - Coordinador solo puede editar beneficiarios de sus tecnicos.
  - Si se envía tecnico_id, valida que el técnico exista y esté activo.
  - Coordinador solo puede asignar técnicos bajo su coordinación.
  - Si cambia `tecnico_id`, se desactivan asignaciones activas previas del beneficiario y se crea la nueva asignacion en `asignaciones_beneficiario`.
  - Respuestas:
    - 200: Beneficiario
    - 400: { error }
    - 403: { error: "Sin permisos para asignar este técnico" }
    - 404: { error: "Beneficiario no encontrado" }

- POST /:id/cadenas
  - Solo administrador.
  - Body: { cadena_ids: uuid[] }
  - Actualiza asignaciones usando beneficiario_cadenas.activo (sin delete fisico).
  - Respuestas:
    - 200: { message: "Cadenas actualizadas" }

- POST /:id/documentos
  - Roles: administrador, coordinador.
  - FormData: archivo, tipo.
  - Coordinador solo puede subir documentos a beneficiarios de sus tecnicos.
  - Guarda metadata en documentos (r2_key, sha256, bytes, subido_por).
  - Respuestas:
    - 201: Documento
    - 400: { error }
    - 404: { error: "Beneficiario no encontrado" }

- GET /:id/documentos
  - Roles: administrador, coordinador.
  - Lista documentos del beneficiario.
  - Coordinador solo puede listar documentos de beneficiarios de sus tecnicos.
  - Respuestas:
    - 200: Documento[]
    - 404: { error: "Beneficiario no encontrado" }

### Asignaciones (/asignaciones)

Requiere rol administrador.

- GET /coordinador-tecnico?tecnico_id=uuid
  - Lee la asignación coordinador-técnico de un técnico.
  - Query param requerido: tecnico_id (uuid).
  - Respuestas:
    - 200: TecnicoDetalle (incluye coordinador_id y fecha_limite)
    - 400: { error: "tecnico_id es requerido" }
    - 404: { error: "Asignación no encontrada" }

- POST /coordinador-tecnico
  - Asigna o reasigna coordinador a un técnico y establece la fecha límite individual.
  - Body:
    - tecnico_id (uuid, requerido)
    - coordinador_id (uuid, requerido)
    - fecha_limite (ISO datetime, requerido)
  - Valida que coordinador sea un usuario activo con rol coordinador.
  - Valida que técnico sea un usuario activo con rol tecnico.
  - Respuestas:
    - 201: TecnicoDetalle
    - 400: { error: "Coordinador inválido o inactivo" }
    - 400: { error: "Técnico inválido o inactivo" }

- DELETE /coordinador-tecnico/:tecnico_id
  - Elimina la asignación coordinador-técnico del técnico indicado.
  - Respuestas:
    - 200: { message: "Asignación removida" }
    - 404: { error: "Asignación no encontrada" }

- POST /beneficiario
  - Body: { tecnico_id, beneficiario_id }
  - Crea o reactiva asignacion.
  - Respuestas:
    - 201: AsignacionBeneficiario

- DELETE /beneficiario/:id
  - Soft remove: activo=false, removido_en=NOW().
  - Retorna 404 si la asignación no existe.
  - Respuestas:
    - 200: { message }
    - 404: { error }

- POST /actividad
  - Body: { tecnico_id, actividad_id }
  - Crea o reactiva asignacion.
  - Respuestas:
    - 201: AsignacionActividad

- DELETE /actividad/:id
  - Soft remove: activo=false, removido_en=NOW().
  - Retorna 404 si la asignación no existe.
  - Respuestas:
    - 200: { message }
    - 404: { error }

### Bitacoras (/bitacoras)

Requiere roles administrador o coordinador.

- GET /
  - Filtros opcionales: tecnico_id, mes, anio, estado, tipo.
  - Respuestas:
    - 200: BitacoraResumen[]

- GET /:id
  - Respuestas:
    - 200: Bitacora
    - 404: { error: "Bitácora no encontrada" }

- PATCH /:id
  - Body opcional:
    - observaciones
    - actividades_realizadas
  - Persiste en columnas:
    - observaciones_coordinador
    - actividades_desc
  - Respuestas:
    - 200: Bitacora
    - 404: { error: "Bitácora no encontrada" }

- PATCH /:id/pdf-config
  - Roles: administrador, coordinador.
  - Guarda configuracion de edicion de PDF para la bitacora.
  - Body: { pdf_edicion: object } — objeto JSONB libre (colores, margenes, etc.).
  - Respuestas:
    - 200: { id, pdf_edicion, updated_at }
    - 404: { error: "Bitácora no encontrada" }

- GET /:id/pdf
  - Render inline PDF.
  - Usa configuracion dinamica desde `configuraciones.clave = 'pdf_encabezado'`.
  - Respuestas:
    - 200: application/pdf
    - 404: { error: "Bitácora no encontrada" }

- GET /:id/pdf/descargar
  - Descarga PDF.
  - Usa configuracion dinamica desde `configuraciones.clave = 'pdf_encabezado'`.
  - Respuestas:
    - 200: application/pdf
    - 404: { error: "Bitácora no encontrada" }

- POST /:id/pdf/imprimir
  - Genera PDF, lo sube y registra version en pdf_versiones.
  - Respuestas:
    - 200: application/pdf
    - 404: { error: "Bitácora no encontrada" }

- GET /:id/versiones
  - Lista versiones PDF.
  - Respuestas:
    - 200: PdfVersion[]
    - 404: { error: "Bitácora no encontrada" }

### Reportes (/reportes)

Requiere roles administrador o coordinador.

- GET /mensual
  - Query opcional: mes, anio.
  - Respuesta: resumen por tecnico (cerradas, borradores, total).
  - Respuestas:
    - 200: { mes, anio, tecnicos }

- GET /tecnico/:id
  - Query opcional: desde, hasta.
  - Respuesta: detalle de bitacoras del tecnico.
  - Coordinador solo puede consultar técnicos bajo su coordinación.
  - Retorna 404 si el técnico no existe o no tiene permisos.
  - Respuestas:
    - 200: { tecnico_id, total, bitacoras }
    - 404: { error: "Técnico no encontrado o sin permisos" }

### Notificaciones (/notificaciones)

Requiere autenticacion (todos los roles incluido tecnico).
Cada ruta filtra por destino_id del usuario autenticado.

- GET /
  - Lista no leidas del usuario autenticado.
  - Respuestas:
    - 200: Notificacion[]

- PATCH /:id/leer
  - Marca una notificacion como leida.
  - Respuestas:
    - 200: { message }

- PATCH /leer-todas
  - Marca todas como leidas para el usuario.
  - Respuestas:
    - 200: { message }

### Localidades (/localidades)

Catalogo manual de localidades por municipio.

- GET /
  - Roles: administrador, coordinador.
  - Devuelve localidades activas ordenadas por municipio, nombre.
  - Respuestas:
    - 200: Localidad[]

- POST /
  - Solo administrador.
  - Body:
    - zona_id? (uuid FK a tabla zonas)
    - municipio
    - nombre
    - cp? (exactamente 5 digitos)
  - Respuestas:
    - 201: Localidad
    - 400: { error: "Zona no encontrada" }
    - 400: { error }

- PATCH /:id
  - Solo administrador.
  - Body parcial: zona_id, municipio, nombre, cp.
  - Solo actualiza localidades activas.
  - Respuestas:
    - 200: Localidad
    - 404: { error: "Localidad no encontrada" }

- DELETE /:id
  - Solo administrador.
  - Soft delete: activo=false.
  - Respuestas:
    - 200: { message }
    - 404: { error: "Localidad no encontrada" }

### Configuraciones (/configuraciones)

Almacen clave-valor JSONB de configuraciones globales.
Claves predefinidas: fecha_corte_global, ciclo_nombre, pdf_encabezado.

- GET /
  - Solo administrador.
  - Lista todas con clave, valor, descripcion, updated_at.
  - Respuestas:
    - 200: Configuracion[]

- GET /:clave
  - Roles: administrador, coordinador.
  - Lee una configuracion especifica.
  - Respuestas:
    - 200: Configuracion
    - 404: { error: "Configuración no encontrada" }

- PUT /:clave
  - Solo administrador.
  - Body: { valor: object } — reemplaza el valor JSONB completo.
  - Retorna 404 si la clave no existe.
  - Respuestas:
    - 200: Configuracion
    - 404: { error: "Configuración no encontrada" }

Ejemplo para pdf_encabezado:
```json
{
  "valor": {
    "institucion": "Secretaria de Desarrollo Agropecuario",
    "dependencia": "Direccion de Fomento",
    "logo_url": "https://...",
    "pie_pagina": "Hidalgo, Mexico"
  }
}
```

### Documentos Plantilla (/documentos-plantilla)

Catalogo global de documentos requeridos por beneficiario.

- GET /activos
  - Roles: administrador, coordinador.
  - Devuelve documentos activos ordenados por orden, nombre.
  - Respuestas:
    - 200: DocumentoPlantilla[]

- GET /
  - Solo administrador.
  - Devuelve todos los documentos (activos e inactivos).
  - Respuestas:
    - 200: DocumentoPlantilla[]

- POST /
  - Solo administrador.
  - Body: nombre, descripcion?, obligatorio? (default true), orden? (default 0).
  - Respuestas:
    - 201: DocumentoPlantilla

- PATCH /:id
  - Solo administrador.
  - Body parcial: nombre, descripcion, obligatorio, orden, activo.
  - Respuestas:
    - 200: DocumentoPlantilla
    - 404: { error: "Documento no encontrado" }

- DELETE /:id
  - Solo administrador.
  - Soft delete: activo=false.
  - Respuestas:
    - 200: { message }
    - 404: { error: "Documento no encontrado" }

### Archive (/archive)

Requiere rol administrador.

- GET /
  - Lista registros de archive_logs.
  - Respuestas:
    - 200: ArchiveLog[]

- GET /:periodo/descargar
  - Descarga el paquete si r2_key_staging contiene URL HTTP(S).
  - Respuestas:
    - 200: application/octet-stream
    - 400: { error }
    - 404: { error }
    - 502: { error }

- POST /:periodo/confirmar
  - Body: { confirmar: true }
  - Actualiza el registro mas reciente del periodo a estado=confirmado.
  - Retorna 404 si no existe archivado para ese periodo.
  - Respuestas:
    - 200: { message }
    - 404: { error }

- POST /:periodo/forzar
  - Inserta evento de generacion en archive_logs.
  - Retorna 409 si ya existe un archivado en estado=generando para ese periodo.
  - Respuestas:
    - 200: { message }
    - 409: { error }

### Zonas (/zonas)

Requiere rol administrador.

- GET /
  - Lista zonas activas.
  - Respuestas:
    - 200: Zona[]

- POST /
  - Body: nombre (min 2 chars), descripcion?.
  - Respuestas:
    - 201: Zona
    - 400: { error }

- PATCH /:id
  - Body parcial: nombre, descripcion.
  - Respuestas:
    - 200: Zona
    - 404: { error: "Zona no encontrada" }

- DELETE /:id
  - Soft delete: activo=false.
  - Respuestas:
    - 200: { message: "Zona desactivada" }
    - 404: { error: "Zona no encontrada" }

### Documentos PDF (/documentos-pdf)

Requiere rol administrador.

- GET /
  - Lista todos los documentos PDF configurados.
  - Respuestas:
    - 200: DocumentoPdf[]

- POST /
  - FormData: archivo (file), clave (string), nombre (string), descripcion? (string).
  - Sube el archivo a Cloudinary y registra metadata en BD.
  - Respuestas:
    - 201: DocumentoPdf
    - 400: { error: "archivo, clave y nombre son requeridos" }

- PATCH /:id
  - Body parcial: clave, nombre, descripcion, activo.
  - Respuestas:
    - 200: DocumentoPdf
    - 404: { error: "Documento no encontrado" }

- DELETE /:id
  - Soft delete: activo=false.
  - Respuestas:
    - 200: { message: "Documento PDF desactivado" }
    - 404: { error: "Documento no encontrado" }

### Dashboard (/dashboard)

- GET /coordinador
  - Requiere rol coordinador.
  - Retorna metricas del coordinador autenticado: conteo de tecnicos, beneficiarios y bitacoras bajo su coordinacion.
  - Respuestas:
    - 200:
      ```json
      {
        "resumen": {
          "tecnicos": 3,
          "beneficiarios": 12,
          "bitacoras": 45,
          "bitacoras_cerradas": 30,
          "bitacoras_borrador": 15
        },
        "tecnicos": [
          {
            "id": "uuid",
            "nombre": "string",
            "correo": "string",
            "telefono": "string",
            "fecha_limite": "ISO date",
            "estado_corte": "en_servicio|corte_aplicado|baja",
            "total_beneficiarios": 4,
            "total_bitacoras": 15
          }
        ]
      }
      ```
    - 401: { error }

## Codigos de error comunes

- 400: Request invalido o validacion fallida.
- 401: No autenticado / token invalido.
- 403: Sin permisos por rol.
- 404: Recurso no encontrado.
- 409: Conflicto de datos (por ejemplo correo duplicado).
