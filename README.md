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
- En cada request: el middleware verifica que `fecha_limite` de la sesion no haya expirado. Si expiro devuelve `401 { error: "periodo_vencido" }`.
- En login: si `fecha_limite < NOW()` se actualiza `estado_corte = corte_aplicado` y se rechaza con `401 { error: "periodo_vencido" }`.
- Extension de periodo: hacer PATCH `/tecnicos/:id` con `fecha_limite` futura resetea automaticamente `estado_corte = en_servicio`.

## Scripts de utilidad

```bash
# Aplicar migraciones pendientes a la base de datos
bun run migrate

# Inspeccionar estructura actual de todas las tablas en la BD
bun run schema

# Verificar tipos TypeScript sin compilar
bun run typecheck
```

## Novedades recientes

- Beneficiarios: se agrego soporte completo de `localidad_id` en `GET /beneficiarios`, `POST /beneficiarios` y `PATCH /beneficiarios/:id`.
- Usuarios (PATCH): `hash_codigo_acceso` solo se recalcula cuando se envia `codigo_acceso` nuevo.
- Archive: `POST /archive/:periodo/confirmar` ahora actualiza el registro mas reciente del periodo (no inserta un duplicado).
- Archive: `POST /archive/:periodo/forzar` retorna `409` si ya existe un archivado en progreso para ese periodo.
- Notificaciones: accesibles para cualquier usuario autenticado (incluye tecnico), siempre filtradas por `destino_id`.
- Actividades (PATCH): `created_by` ya no es editable desde API.

## Arranque rapido

```bash
# Instalar dependencias
bun install

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

## Endpoints

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
| POST | /usuarios | administrador | { correo, nombre, rol, telefono?, coordinador_id?, fecha_limite? } |
| PATCH | /usuarios/:id | administrador | { nombre?, correo?, rol?, codigo_acceso?, telefono?, coordinador_id?, fecha_limite? } |
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
| POST | /beneficiarios/:id/cadenas | administrador | { cadena_ids: uuid[] } |
| POST | /beneficiarios/:id/documentos | administrador, coordinador | FormData(archivo, tipo) |
| GET | /beneficiarios/:id/documentos | administrador, coordinador | - |

### Asignaciones

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| POST | /asignaciones/beneficiario | administrador | { tecnico_id, beneficiario_id } |
| DELETE | /asignaciones/beneficiario/:id | administrador | - |
| POST | /asignaciones/actividad | administrador | { tecnico_id, actividad_id } |
| DELETE | /asignaciones/actividad/:id | administrador | - |

### Bitacoras

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| GET | /bitacoras | administrador, coordinador | Query opcional: tecnico_id, mes, anio, estado, tipo |
| GET | /bitacoras/:id | administrador, coordinador | - |
| PATCH | /bitacoras/:id | administrador, coordinador | { observaciones?, actividades_realizadas? } |
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
| GET | /notificaciones | todos (autenticado) | - |
| PATCH | /notificaciones/:id/leer | todos (autenticado) | - |
| PATCH | /notificaciones/leer-todas | todos (autenticado) | - |

### Localidades

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| GET | /localidades | administrador, coordinador | - |
| POST | /localidades | administrador | { municipio, nombre, cp? } |
| PATCH | /localidades/:id | administrador | { municipio?, nombre?, cp? } |
| DELETE | /localidades/:id | administrador | - |

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
| GET | /archive/:periodo/descargar | administrador | - |
| POST | /archive/:periodo/confirmar | administrador | { confirmar: true } |
| POST | /archive/:periodo/forzar | administrador | - |

### Auth (/auth)

- POST /request-codigo-acceso
  - Body: { correo }
  - Nota: endpoint informativo/compatibilidad; ya no genera codigo por correo.

- POST /verify-codigo-acceso
  - Body: { correo, codigo_acceso }
  - Login por compatibilidad.

- POST /login
  - Body: { correo, codigo_acceso }
  - Busca usuario activo por correo, compara con hash_codigo_acceso (bcrypt), crea token UUID, guarda sesion en Redis y registra auth_logs login.
  - Respuesta 200:
    - { token, usuario: { id, nombre, correo, rol } }

- POST /request-otp
  - Compatibilidad temporal (mismo comportamiento de request-codigo-acceso).

- POST /verify-otp
  - Compatibilidad temporal (mismo comportamiento de login).

- POST /logout
  - Requiere Bearer token.
  - Elimina session:{token} en Redis y registra auth_logs logout.

### Usuarios (/usuarios)

Requiere rol administrador.

- GET /
  - Lista usuarios (incluye codigo_acceso).

- POST /
  - Body:
    - correo (email)
    - nombre
    - rol: tecnico | coordinador | administrador
    - telefono? (solo tecnico)
    - coordinador_id? (requerido si rol=tecnico)
    - fecha_limite? (requerido si rol=tecnico)
  - Crea usuario y genera automaticamente codigo_acceso:
    - tecnico: 5 digitos
    - coordinador/administrador: 6 digitos
  - Guarda codigo_acceso en texto plano y hash_codigo_acceso en bcrypt cost 12.
  - Si rol=tecnico, crea usuario con rol tecnico y su detalle en tecnico_detalles.
  - Respuesta 201 incluye codigo_acceso.

- PATCH /:id
  - Body parcial: nombre, correo, rol, codigo_acceso, telefono, coordinador_id, fecha_limite.
  - Si se actualiza codigo_acceso, tambien se actualiza hash_codigo_acceso.
  - Si no se envia codigo_acceso, se conserva el hash actual sin recalcular.
  - Valida correo unico entre usuarios activos.
  - Si rol final es tecnico y se envia coordinador_id, valida que el coordinador exista y este activo.
  - Si el usuario es tecnico, sincroniza datos en tecnico_detalles cuando corresponde.

- DELETE /:id
  - Soft delete: activo=false, updated_at=NOW().
  - Retorna 404 si el usuario no existe.
  - Si el usuario tiene rol=tecnico, tambien desactiva su registro en tecnico_detalles.

### Tecnicos (/tecnicos)

Requiere autenticacion.

- GET /
  - Roles: administrador, coordinador.
  - Admin ve todos los activos; coordinador solo los suyos.

- GET /:id
  - Roles: administrador, coordinador.

- POST /
  - Solo administrador.
  - No disponible para crear tecnicos.
  - La alta de tecnicos se realiza en /usuarios con rol=tecnico.

- PATCH /:id
  - Solo administrador.
  - Body parcial: nombre, correo, telefono, coordinador_id, fecha_limite.
  - Valida correo unico contra usuarios activos.
  - Si cambia coordinador_id, valida que sea un coordinador activo.
  - Sincroniza nombre/correo en la tabla usuarios para mantener consistencia.
  - Si fecha_limite es una fecha futura, resetea estado_corte a en_servicio automaticamente.

- POST /aplicar-cortes
  - Solo administrador.
  - Aplica estado_corte=corte_aplicado a todos los tecnicos con fecha_limite vencida y estado en_servicio.
  - Respuesta: lista de tecnicos actualizados.

- POST /:id/cerrar-corte
  - Roles: administrador, coordinador.
  - Coordinador solo puede cerrar tecnicos bajo su coordinacion.
  - Aplica estado_corte=corte_aplicado al tecnico indicado.

- POST /:id/codigo
  - Solo administrador.
  - Genera codigo numerico de 5 digitos para tecnico.
  - Lo guarda en usuarios.codigo_acceso, actualizando usuarios.hash_codigo_acceso.
  - No usa Redis para codigos tecnicos.

- DELETE /:id
  - Solo administrador.
  - Soft delete tecnico: activo=false, updated_at=NOW().
  - Tambien desactiva el detalle tecnico asociado en tecnico_detalles.
  - Retorna 404 si el técnico no existe.

### Cadenas Productivas (/cadenas-productivas)

- GET /
  - Roles: administrador, coordinador.

- POST /
  - Solo administrador.
  - Body: nombre, descripcion?.

- PATCH /:id
  - Solo administrador.
  - Body parcial: nombre, descripcion.

- DELETE /:id
  - Solo administrador.
  - Soft delete: activo=false, updated_at=NOW().
  - Retorna 404 si la cadena no existe.

### Actividades (/actividades)

- GET /
  - Roles: administrador, coordinador.

- POST /
  - Solo administrador.
  - Body: nombre, descripcion?.

- PATCH /:id
  - Solo administrador.
  - Body parcial: nombre, descripcion.

- DELETE /:id
  - Solo administrador.
  - Soft delete: activo=false, updated_at=NOW().
  - Retorna 404 si la actividad no existe.

### Beneficiarios (/beneficiarios)

- GET /
  - Roles: administrador, coordinador.

- GET /:id
  - Regresa beneficiario con cadenas activas y documentos.

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
  - telefonos se almacenan como bytea.
  - coord_parcela se almacena como point.

- PATCH /:id
  - Roles: administrador, coordinador.
  - Body parcial de los mismos campos incluyendo localidad_id.
  - Si se envía tecnico_id, valida que el técnico exista y esté activo.
  - Coordinador solo puede asignar técnicos bajo su coordinación.

- POST /:id/cadenas
  - Solo administrador.
  - Body: { cadena_ids: uuid[] }
  - Actualiza asignaciones usando beneficiario_cadenas.activo (sin delete fisico).

- POST /:id/documentos
  - Roles: administrador, coordinador.
  - FormData: archivo, tipo.
  - Guarda metadata en documentos (r2_key, sha256, bytes, subido_por).

- GET /:id/documentos
  - Lista documentos del beneficiario.

### Asignaciones (/asignaciones)

Requiere rol administrador.

- POST /beneficiario
  - Body: { tecnico_id, beneficiario_id }
  - Crea o reactiva asignacion.

- DELETE /beneficiario/:id
  - Soft remove: activo=false, removido_en=NOW().
  - Retorna 404 si la asignación no existe.

- POST /actividad
  - Body: { tecnico_id, actividad_id }
  - Crea o reactiva asignacion.

- DELETE /actividad/:id
  - Soft remove: activo=false, removido_en=NOW().
  - Retorna 404 si la asignación no existe.

### Bitacoras (/bitacoras)

Requiere roles administrador o coordinador.

- GET /
  - Filtros opcionales: tecnico_id, mes, anio, estado, tipo.

- GET /:id

- PATCH /:id
  - Body opcional:
    - observaciones
    - actividades_realizadas
  - Persiste en columnas:
    - observaciones_coordinador
    - actividades_desc

- GET /:id/pdf
  - Render inline PDF.
  - Usa configuracion dinamica desde `configuraciones.clave = 'pdf_encabezado'`.

- GET /:id/pdf/descargar
  - Descarga PDF.
  - Usa configuracion dinamica desde `configuraciones.clave = 'pdf_encabezado'`.

- POST /:id/pdf/imprimir
  - Genera PDF, lo sube y registra version en pdf_versiones.

- GET /:id/versiones
  - Lista versiones PDF.

### Reportes (/reportes)

Requiere roles administrador o coordinador.

- GET /mensual
  - Query opcional: mes, anio.
  - Respuesta: resumen por tecnico (cerradas, borradores, total).

- GET /tecnico/:id
  - Query opcional: desde, hasta.
  - Respuesta: detalle de bitacoras del tecnico.
  - Coordinador solo puede consultar técnicos bajo su coordinación.
  - Retorna 404 si el técnico no existe o no tiene permisos.

### Notificaciones (/notificaciones)

Requiere autenticacion (todos los roles incluido tecnico).
Cada ruta filtra por destino_id del usuario autenticado.

- GET /
  - Lista no leidas del usuario autenticado.

- PATCH /:id/leer
  - Marca una notificacion como leida.

- PATCH /leer-todas
  - Marca todas como leidas para el usuario.

### Localidades (/localidades)

Catalogo manual de localidades por municipio.

- GET /
  - Roles: administrador, coordinador.
  - Devuelve localidades activas ordenadas por municipio, nombre.

- POST /
  - Solo administrador.
  - Body: municipio, nombre, cp? (exactamente 5 digitos).

- PATCH /:id
  - Solo administrador.
  - Body parcial: municipio, nombre, cp.
  - Solo actualiza localidades activas.

- DELETE /:id
  - Solo administrador.
  - Soft delete: activo=false.

### Configuraciones (/configuraciones)

Almacen clave-valor JSONB de configuraciones globales.
Claves predefinidas: fecha_corte_global, ciclo_nombre, pdf_encabezado.

- GET /
  - Solo administrador.
  - Lista todas con clave, valor, descripcion, updated_at.

- GET /:clave
  - Roles: administrador, coordinador.
  - Lee una configuracion especifica.

- PUT /:clave
  - Solo administrador.
  - Body: { valor: object } — reemplaza el valor JSONB completo.
  - Retorna 404 si la clave no existe.

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

- GET /
  - Solo administrador.
  - Devuelve todos los documentos (activos e inactivos).

- POST /
  - Solo administrador.
  - Body: nombre, descripcion?, obligatorio? (default true), orden? (default 0).

- PATCH /:id
  - Solo administrador.
  - Body parcial: nombre, descripcion, obligatorio, orden, activo.

- DELETE /:id
  - Solo administrador.
  - Soft delete: activo=false.

### Archive (/archive)

Requiere rol administrador.

- GET /
  - Lista registros de archive_logs.

- GET /:periodo/descargar
  - Descarga el paquete si r2_key_staging contiene URL HTTP(S).

- POST /:periodo/confirmar
  - Body: { confirmar: true }
  - Actualiza el registro mas reciente del periodo a estado=confirmado.
  - Retorna 404 si no existe archivado para ese periodo.

- POST /:periodo/forzar
  - Inserta evento de generacion en archive_logs.
  - Retorna 409 si ya existe un archivado en estado=generando para ese periodo.

## Codigos de error comunes

- 400: Request invalido o validacion fallida.
- 401: No autenticado / token invalido.
- 403: Sin permisos por rol.
- 404: Recurso no encontrado.
- 409: Conflicto de datos (por ejemplo correo duplicado).
