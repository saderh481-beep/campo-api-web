# API Web - Endpoints

Documentacion actualizada de endpoints expuestos por la API.

## Base

- Health: GET /health
- Prefijos montados:
  - /auth
  - /usuarios
  - /tecnicos
  - /cadenas-productivas
  - /actividades
  - /beneficiarios
  - /asignaciones
  - /bitacoras
  - /reportes
  - /archive
  - /notificaciones

## Autenticacion

Todas las rutas protegidas usan header Authorization con esquema Bearer.

Ejemplo:

Authorization: Bearer <token>

El token se valida contra Redis en la clave session:{token}.

## Roles

Roles usados por el backend:

- administrador
- coordinador
- tecnico

## Endpoints

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
| POST | /usuarios | administrador | { correo, nombre, rol } |
| PATCH | /usuarios/:id | administrador | { nombre?, correo?, rol? } |
| DELETE | /usuarios/:id | administrador | - |

### Tecnicos

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| GET | /tecnicos | administrador, coordinador | - |
| GET | /tecnicos/:id | administrador, coordinador | - |
| POST | /tecnicos | administrador | { nombre, correo, coordinador_id, fecha_limite } |
| PATCH | /tecnicos/:id | administrador | { nombre?, correo?, telefono?, coordinador_id?, fecha_limite? } |
| POST | /tecnicos/:id/codigo | administrador | - |
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
| PATCH | /actividades/:id | administrador | { nombre?, descripcion?, created_by? } |
| DELETE | /actividades/:id | administrador | - |

### Beneficiarios

| Metodo | Ruta | Rol | Body minimo |
|---|---|---|---|
| GET | /beneficiarios | administrador, coordinador | - |
| GET | /beneficiarios/:id | administrador, coordinador | - |
| POST | /beneficiarios | administrador, coordinador | { nombre, municipio, tecnico_id } |
| PATCH | /beneficiarios/:id | administrador, coordinador | { nombre?, municipio?, localidad?, direccion?, cp?, telefono_principal?, telefono_secundario?, coord_parcela?, tecnico_id? } |
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
| GET | /notificaciones | administrador, coordinador | - |
| PATCH | /notificaciones/:id/leer | administrador, coordinador | - |
| PATCH | /notificaciones/leer-todas | administrador, coordinador | - |

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
  - Lista usuarios.

- POST /
  - Body:
    - correo (email)
    - nombre
    - rol: tecnico | coordinador | administrador
  - Crea usuario y genera automaticamente codigo_acceso:
    - tecnico: 5 digitos
    - coordinador/administrador: 6 digitos
  - Guarda codigo_acceso en texto plano y hash_codigo_acceso en bcrypt cost 12.
  - Respuesta 201 incluye codigo_acceso solo en esta respuesta de creacion.

- PATCH /:id
  - Body parcial: nombre, correo, rol.

- DELETE /:id
  - Soft delete: activo=false, updated_at=NOW().

### Tecnicos (/tecnicos)

Requiere autenticacion.

- GET /
  - Roles: administrador, coordinador.
  - Admin ve todos los activos; coordinador solo los suyos.

- GET /:id
  - Roles: administrador, coordinador.

- POST /
  - Solo administrador.
  - Body: nombre, correo, telefono?, coordinador_id, fecha_limite.

- PATCH /:id
  - Solo administrador.
  - Body parcial: nombre, correo, telefono, coordinador_id, fecha_limite.

- POST /:id/codigo
  - Solo administrador.
  - Genera codigo numerico para tecnico, lo guarda en tecnicos.codigo_acceso y en Redis (tech:{codigo}) con TTL hasta fecha_limite.

- DELETE /:id
  - Solo administrador.
  - Soft delete: activo=false, updated_at=NOW().

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

### Actividades (/actividades)

- GET /
  - Roles: administrador, coordinador.

- POST /
  - Solo administrador.
  - Body: nombre, descripcion?.

- PATCH /:id
  - Solo administrador.
  - Body parcial: nombre, descripcion, created_by?.

- DELETE /:id
  - Solo administrador.
  - Soft delete: activo=false, updated_at=NOW().

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
  - Body parcial de los mismos campos.

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

- POST /actividad
  - Body: { tecnico_id, actividad_id }
  - Crea o reactiva asignacion.

- DELETE /actividad/:id
  - Soft remove: activo=false, removido_en=NOW().

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

- GET /:id/pdf/descargar
  - Descarga PDF.

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

### Notificaciones (/notificaciones)

Requiere roles administrador o coordinador.

- GET /
  - Lista no leidas del usuario autenticado.

- PATCH /:id/leer
  - Marca una notificacion como leida.

- PATCH /leer-todas
  - Marca todas como leidas para el usuario.

### Archive (/archive)

Requiere rol administrador.

- GET /
  - Lista registros de archive_logs.

- GET /:periodo/descargar
  - Descarga el paquete si r2_key_staging contiene URL HTTP(S).

- POST /:periodo/confirmar
  - Body: { confirmar: true }
  - Inserta evento de confirmacion en archive_logs (append-only).

- POST /:periodo/forzar
  - Inserta evento de generacion en archive_logs (append-only).

## Codigos de error comunes

- 400: Request invalido o validacion fallida.
- 401: No autenticado / token invalido.
- 403: Sin permisos por rol.
- 404: Recurso no encontrado.
- 409: Conflicto de datos (por ejemplo correo duplicado).
