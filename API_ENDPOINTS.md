# API Contract for Frontend

Base URL: /api/v1
Auth header for protected routes: Authorization: Bearer <token>

Error shape (general):
- { "error": string }
- Some endpoints also return { "message": string }

Validation note:
- Las rutas con validación Zod responden `422` cuando el body, query o params no cumplen el formato esperado.
- En particular, la mayoría de rutas con `:id`, `:tecnico_id` o ids relacionados esperan UUID válido.

## Auth

### POST /auth/request-codigo-acceso
Request body:
```json
{ "correo": "user@mail.com" }
```
Success:
- 200: { "message": string }
Errors:
- 400: validation error

### POST /auth/verify-codigo-acceso
Same behavior as /auth/login.

### POST /auth/login
Request body:
```json
{ "correo": "user@mail.com", "codigo_acceso": "12345" }
```
Success:
- 200:
```json
{
  "token": "uuid",
  "usuario": {
    "id": "uuid",
    "nombre": "string",
    "correo": "string",
    "rol": "administrador|coordinador|tecnico"
  }
}
```
Errors:
- 401: { "error": "Credenciales invalidas" }
- 401: { "error": "periodo_vencido", "message": "..." }
- 401: { "error": "periodo_no_configurado", "message": "..." }

### POST /auth/request-otp
Compatibility endpoint. Same as /auth/request-codigo-acceso.

### POST /auth/verify-otp
Compatibility endpoint. Same as /auth/login.

### POST /auth/logout
Success:
- 200: { "message": "Sesion cerrada" }
Errors:
- 401: { "error": string }

## Usuarios
Role required: administrador

Shape `Usuario`:
```json
{
  "id": "uuid",
  "nombre": "string",
  "correo": "string",
  "rol": "administrador|coordinador|tecnico",
  "codigo_acceso": "string",
  "telefono": "string|null",
  "activo": true,
  "created_at": "ISO datetime",
  "updated_at": "ISO datetime"
}
```

### GET /usuarios
Devuelve todos los usuarios (activos e inactivos).

Success:
- 200: `Usuario[]`

### POST /usuarios
Crea un nuevo usuario. El `codigo_acceso` se genera automáticamente:
- `tecnico` → 5 dígitos
- `coordinador` / `administrador` → 6 dígitos

La validación de correo solo bloquea si existe otro usuario **activo** con ese correo.

Request body:
```json
{
  "correo": "user@example.com",
  "nombre": "Nombre Apellido",
  "rol": "tecnico|coordinador|administrador",
  "telefono": "string (opcional)"
}
```
Success:
```json
{
  "id": "uuid",
  "nombre": "string",
  "correo": "string",
  "rol": "string",
  "codigo_acceso": "12345",
  "telefono": null,
  "activo": true,
  "created_at": "ISO datetime",
  "updated_at": "ISO datetime"
}
```
Status: 201

Errors:
- 409: `{ "error": "El correo ya está registrado" }`
- 422: error de validación (campo faltante o inválido)

### PATCH /usuarios/:id
Edita un usuario. Todos los campos son opcionales.

Nota `activo`: usar `true` para reactivar, `false` para desactivar (equivalente a DELETE pero con respuesta completa del usuario actualizado). Si se desactiva un usuario con `rol=tecnico`, también se marca su `tecnico_detalles` como inactivo con `estado_corte=baja`.

Nota `codigo_acceso`: si se envía, también se recalcula `hash_codigo_acceso`. La longitud debe coincidir con el rol final (5 para tecnico, 6 para otros).

Request body (todos opcionales):
```json
{
  "nombre": "string",
  "correo": "email",
  "rol": "tecnico|coordinador|administrador",
  "codigo_acceso": "12345 o 123456",
  "telefono": "string",
  "activo": true
}
```
Success:
- 200: `Usuario` (mismo shape que POST)

Errors:
- 400: `{ "error": "El codigo_acceso para rol tecnico debe tener 5 dígitos" }`
- 404: `{ "error": "Usuario no encontrado" }`
- 409: `{ "error": "El correo ya está registrado" }`
- 422: error de validación de campo

### DELETE /usuarios/:id
Soft-delete: marca `activo=false`. Si el usuario tiene `rol=tecnico`, también desactiva su `tecnico_detalles`.

Nota: no se puede eliminar la propia cuenta del usuario autenticado.

Success:
- 200: `{ "message": "Usuario desactivado" }`

Errors:
- 400: `{ "error": "No puedes desactivar tu propia cuenta" }`
- 404: `{ "error": "Usuario no encontrado" }`

## Tecnicos

### GET /tecnicos
Roles: administrador, coordinador
Success:
- 200: Tecnico[]

### GET /tecnicos/:id
Roles: administrador, coordinador
Success:
- 200: TecnicoDetalle (includes asignaciones)
Errors:
- 403: { "error": "Sin permisos" }
- 404: { "error": "Técnico no encontrado" }
- 422: error de validación (uuid inválido)

### POST /tecnicos
Role: administrador
Not available.
Errors:
- 405: { "error": "La creación de técnicos se realiza desde /usuarios con rol 'tecnico'." }
- 422: error de validación del body

### PATCH /tecnicos/:id
Role: administrador
Request body (partial):
```json
{
  "nombre": "string?",
  "correo": "string?",
  "telefono": "string?",
  "coordinador_id": "uuid?",
  "fecha_limite": "ISO datetime?"
}
```
Success:
- 200: Tecnico
Errors:
- 400: { "error": string }
- 404: { "error": "Técnico no encontrado" }
- 409: { "error": "El correo ya está registrado" }
- 422: error de validación

### POST /tecnicos/:id/codigo
Role: administrador
Success:
- 200: { "message": "Código generado y enviado", "codigo": "12345" }
Errors:
- 404: { "error": "Técnico no encontrado" }
- 422: error de validación (uuid inválido)

### POST /tecnicos/aplicar-cortes
Role: administrador
Success:
- 200: { "message": string, "tecnicos": array }

### POST /tecnicos/:id/cerrar-corte
Roles: administrador, coordinador
Success:
- 200: { "message": "Período cerrado", "tecnico": object }
Errors:
- 403: { "error": "Sin permisos sobre este técnico" }
- 404: { "error": "Técnico no encontrado" }
- 422: error de validación (uuid inválido)

### DELETE /tecnicos/:id
Role: administrador
Success:
- 200: { "message": "Técnico desactivado" }
Errors:
- 404: { "error": "Técnico no encontrado" }
- 422: error de validación (uuid inválido)

## Asignaciones
Role required: administrador

Shape `TecnicoDetalle`:
```json
{
  "id": "uuid",
  "tecnico_id": "uuid",
  "coordinador_id": "uuid",
  "coordinador_nombre": "string",
  "fecha_limite": "ISO datetime",
  "estado_corte": "en_servicio|corte_aplicado|baja",
  "activo": true,
  "created_at": "ISO datetime",
  "updated_at": "ISO datetime"
}
```

Shape `AsignacionBeneficiario`:
```json
{
  "id": "uuid",
  "tecnico_id": "uuid",
  "beneficiario_id": "uuid",
  "activo": true,
  "asignado_por": "uuid",
  "asignado_en": "ISO datetime",
  "removido_en": "ISO datetime|null"
}
```

Shape `AsignacionActividad`:
```json
{
  "id": "uuid",
  "tecnico_id": "uuid",
  "actividad_id": "uuid",
  "activo": true,
  "asignado_por": "uuid",
  "asignado_en": "ISO datetime",
  "removido_en": "ISO datetime|null"
}
```

### GET /asignaciones/coordinador-tecnico?tecnico_id=\<uuid\>
Query param requerido: `tecnico_id` (uuid).

Success:
- 200: `TecnicoDetalle`

Errors:
- 404: `{ "error": "Asignación no encontrada" }`
- 422: error de validación (uuid faltante o inválido)

### GET /asignaciones/coordinador-tecnico/lista?tecnico_id=\<uuid\>
Lista asignaciones coordinador->técnico. `tecnico_id` es opcional para filtrar.

Success:
- 200: `TecnicoDetalle[]`

Errors:
- 422: error de validación (uuid inválido en filtro)

### GET /asignaciones/coordinador-tecnico/:tecnico_id
Obtiene una asignación coordinador->técnico por `tecnico_id` en path.

Success:
- 200: `TecnicoDetalle`

Errors:
- 404: `{ "error": "Asignación no encontrada" }`
- 422: error de validación (uuid inválido)

### POST /asignaciones/coordinador-tecnico
Asigna o reasigna coordinador a un técnico. Valida que coordinador y técnico existan y estén activos.

Request body:
```json
{
  "tecnico_id": "uuid",
  "coordinador_id": "uuid",
  "fecha_limite": "ISO datetime"
}
```
Success:
- 201: `TecnicoDetalle`

Errors:
- 400: `{ "error": "Coordinador inválido o inactivo" }`
- 400: `{ "error": "Técnico inválido o inactivo" }`
- 422: error de validación del body

### PATCH /asignaciones/coordinador-tecnico/:tecnico_id
Edita una asignación coordinador->técnico.

Request body (todos opcionales):
```json
{
  "coordinador_id": "uuid",
  "fecha_limite": "ISO datetime",
  "activo": true
}
```

Success:
- 200: `TecnicoDetalle`

Errors:
- 400: `{ "error": "Coordinador inválido o inactivo" }`
- 404: `{ "error": "Asignación no encontrada" }`
- 422: error de validación

### DELETE /asignaciones/coordinador-tecnico/:tecnico_id
Marca `activo=false` y `estado_corte=baja` en `tecnico_detalles`.

Success:
- 200: `{ "message": "Asignación removida" }`

Errors:
- 404: `{ "error": "Asignación no encontrada" }`
- 422: error de validación (uuid inválido)

### GET /asignaciones/beneficiario?tecnico_id=\<uuid\>&beneficiario_id=\<uuid\>&activo=true|false
Lista asignaciones técnico->beneficiario con filtros opcionales.

Success:
- 200: `AsignacionBeneficiario[]`

Errors:
- 422: error de validación en query

### GET /asignaciones/beneficiario/:id
Obtiene una asignación técnico->beneficiario por id.

Success:
- 200: `AsignacionBeneficiario`

Errors:
- 404: `{ "error": "Asignación no encontrada" }`
- 422: error de validación (uuid inválido)

### POST /asignaciones/beneficiario
Asigna o reactiva una asignación de beneficiario a técnico. Si ya existía una asignación previa para esa pareja, la reactiva en lugar de insertar un duplicado. Valida que el técnico y el beneficiario existan y estén activos.

Request body:
```json
{
  "tecnico_id": "uuid",
  "beneficiario_id": "uuid"
}
```
Success:
- 201: `AsignacionBeneficiario`

Errors:
- 400: `{ "error": "Técnico inválido o inactivo" }`
- 404: `{ "error": "Beneficiario no encontrado" }`
- 422: error de validación del body

### PATCH /asignaciones/beneficiario/:id
Edita una asignación técnico->beneficiario.

Request body (todos opcionales):
```json
{
  "tecnico_id": "uuid",
  "beneficiario_id": "uuid",
  "activo": true
}
```

Success:
- 200: `AsignacionBeneficiario`

Errors:
- 400: `{ "error": "Técnico inválido o inactivo" }`
- 404: `{ "error": "Asignación no encontrada" }`
- 404: `{ "error": "Beneficiario no encontrado" }`
- 422: error de validación

### DELETE /asignaciones/beneficiario/:id
Soft-remove: marca `activo=false` y `removido_en=NOW()` por id de asignación.

Success:
- 200: `{ "message": "Asignación removida" }`

Errors:
- 404: `{ "error": "Asignación no encontrada" }`
- 422: error de validación (uuid inválido)

### GET /asignaciones/actividad?tecnico_id=\<uuid\>&actividad_id=\<uuid\>&activo=true|false
Lista asignaciones técnico->actividad con filtros opcionales.

Success:
- 200: `AsignacionActividad[]`

Errors:
- 422: error de validación en query

### GET /asignaciones/actividad/:id
Obtiene una asignación técnico->actividad por id.

Success:
- 200: `AsignacionActividad`

Errors:
- 404: `{ "error": "Asignación de actividad no encontrada" }`
- 422: error de validación (uuid inválido)

### POST /asignaciones/actividad
Asigna o reactiva una actividad a un técnico. Valida que tanto el técnico como la actividad existan y estén activos.

Request body:
```json
{
  "tecnico_id": "uuid",
  "actividad_id": "uuid"
}
```
Success:
- 201: `AsignacionActividad`

Errors:
- 400: `{ "error": "Técnico inválido o inactivo" }`
- 404: `{ "error": "Actividad no encontrada" }`
- 422: error de validación del body

### PATCH /asignaciones/actividad/:id
Edita una asignación técnico->actividad.

Request body (todos opcionales):
```json
{
  "tecnico_id": "uuid",
  "actividad_id": "uuid",
  "activo": true
}
```

Success:
- 200: `AsignacionActividad`

Errors:
- 400: `{ "error": "Técnico inválido o inactivo" }`
- 404: `{ "error": "Asignación de actividad no encontrada" }`
- 404: `{ "error": "Actividad no encontrada" }`
- 422: error de validación

### DELETE /asignaciones/actividad/:id
Soft-remove: marca `activo=false` y `removido_en=NOW()` por id de asignación.

Success:
- 200: `{ "message": "Asignación de actividad removida" }`

Errors:
- 404: `{ "error": "Asignación de actividad no encontrada" }`
- 422: error de validación (uuid inválido)

## Beneficiarios
Roles: administrador, coordinador

Shape `Beneficiario`:
```json
{
  "id": "uuid",
  "tecnico_id": "uuid",
  "nombre": "string",
  "municipio": "string",
  "localidad": "string|null",
  "localidad_id": "uuid|null",
  "direccion": "string|null",
  "cp": "string|null",
  "telefono_principal": "string|null",
  "telefono_secundario": "string|null",
  "coord_parcela": "(x,y)|null",
  "activo": true,
  "created_at": "ISO datetime",
  "updated_at": "ISO datetime"
}
```

Shape `BeneficiarioDetalle` (incluye relaciones):
```json
{
  "id": "uuid",
  "...campos de Beneficiario...",
  "cadenas": [
    { "id": "uuid", "nombre": "string" }
  ],
  "documentos": [
    {
      "id": "uuid",
      "tipo": "string",
      "nombre_original": "string",
      "r2_key": "string (URL)",
      "sha256": "string (64 hex)",
      "bytes": 12345,
      "subido_por": "uuid",
      "created_at": "ISO datetime"
    }
  ]
}
```

### GET /beneficiarios
Devuelve lista de beneficiarios.
- Administrador: todos los beneficiarios activos.
- Coordinador: solo los beneficiarios cuyo `tecnico_id` pertenece a un técnico activo bajo su coordinación.

Ordenados por `nombre`.

Success:
- 200: `Beneficiario[]`

### GET /beneficiarios/:id
Devuelve datos del beneficiario junto con cadenas productivas activas y documentos.
- Coordinador: solo puede consultar beneficiarios de sus técnicos (devuelve 404 si no pertenece).

Nota: solo devuelve beneficiarios activos.

Success:
- 200: `BeneficiarioDetalle`

Errors:
- 404: `{ "error": "Beneficiario no encontrado" }`
- 422: error de validación (uuid inválido)

### POST /beneficiarios
Crea un beneficiario y automáticamente crea la asignación activa en `asignaciones_beneficiario` dentro de la misma transacción.
- Coordinador: solo puede asignar técnicos que estén bajo su coordinación.

Request body:
```json
{
  "nombre": "string (mín. 2 caracteres)",
  "municipio": "string",
  "localidad": "string (opcional)",
  "localidad_id": "uuid (opcional, FK a localidades)",
  "direccion": "string (opcional)",
  "cp": "string (opcional)",
  "telefono_principal": "string (opcional)",
  "telefono_secundario": "string (opcional)",
  "coord_parcela": "x,y o (x,y) (opcional)",
  "tecnico_id": "uuid (requerido)"
}
```
Success:
- 201: `Beneficiario`

Errors:
- 400: `{ "error": "coord_parcela debe tener formato 'x,y'" }`
- 400: `{ "error": "Localidad no encontrada o inactiva" }`
- 400: `{ "error": "Técnico no encontrado o inactivo" }`
- 403: `{ "error": "Sin permisos para asignar este técnico" }`
- 422: error de validación (campo requerido faltante)

### PATCH /beneficiarios/:id
Edita campos del beneficiario. Si cambia `tecnico_id`, actualiza también `asignaciones_beneficiario` en la misma transacción (desactiva la asignación previa e inserta la nueva).
- Coordinador: solo puede editar beneficiarios de sus técnicos y solo puede asignar técnicos bajo su coordinación.

Request body (todos opcionales):
```json
{
  "nombre": "string",
  "municipio": "string",
  "localidad": "string",
  "localidad_id": "uuid",
  "direccion": "string",
  "cp": "string",
  "telefono_principal": "string",
  "telefono_secundario": "string",
  "coord_parcela": "x,y o (x,y)",
  "tecnico_id": "uuid"
}
```
Success:
- 200: `Beneficiario`

Errors:
- 400: `{ "error": "coord_parcela debe tener formato 'x,y'" }`
- 400: `{ "error": "Localidad no encontrada o inactiva" }`
- 400: `{ "error": "Técnico no encontrado o inactivo" }`
- 403: `{ "error": "Sin permisos para asignar este técnico" }`
- 404: `{ "error": "Beneficiario no encontrado" }`
- 422: error de validación

### DELETE /beneficiarios/:id
Soft-delete del beneficiario (`activo=false`) y desactivación de asignaciones activas en `asignaciones_beneficiario`.

Success:
- 200: `{ "message": "Beneficiario desactivado" }`

Errors:
- 404: `{ "error": "Beneficiario no encontrado" }`
- 422: error de validación (uuid inválido)

### POST /beneficiarios/:id/cadenas
Role: administrador

Reemplaza las cadenas productivas del beneficiario. Usa `activo=false` para los registros previos y `activo=true` para los nuevos (sin borrado físico). Si `cadena_ids` está vacío, desactiva todas.

Request body:
```json
{
  "cadena_ids": ["uuid", "uuid"]
}
```
Success:
- 200: `{ "message": "Cadenas actualizadas" }`

Errors:
- 400: `{ "error": "Una o más cadenas no existen o están inactivas" }`
- 404: `{ "error": "Beneficiario no encontrado" }`
- 422: error de validación

### POST /beneficiarios/:id/documentos
Sube un documento al beneficiario. Lo almacena en Cloudinary y guarda la metadata en la tabla `documentos`.
- Coordinador: solo puede subir documentos a beneficiarios de sus técnicos.

Nota: solo permite documentos en beneficiarios activos.

Request: `multipart/form-data`
- `archivo` (File, requerido): archivo a subir.
- `tipo` (string, requerido): categoría o tipo del documento (ej. `"ine"`, `"curp"`).

Success:
```json
{
  "id": "uuid",
  "tipo": "string",
  "nombre_original": "string",
  "r2_key": "string (URL de Cloudinary)",
  "sha256": "string (64 hex)",
  "bytes": 12345,
  "subido_por": "uuid",
  "created_at": "ISO datetime"
}
```
Status: 201

Errors:
- 400: `{ "error": "Archivo y tipo son requeridos" }`
- 404: `{ "error": "Beneficiario no encontrado" }`
- 422: error de validación (uuid inválido)

### GET /beneficiarios/:id/documentos
Lista documentos del beneficiario.
- Coordinador: solo puede listar documentos de beneficiarios de sus técnicos.

Nota: solo lista documentos de beneficiarios activos.

Success:
- 200: Documento[] (mismo shape que el body de POST /documentos)

Errors:
- 404: `{ "error": "Beneficiario no encontrado" }`
- 422: error de validación (uuid inválido)

## Bitacoras
Roles: administrador, coordinador

### GET /bitacoras
Query params (all optional): tecnico_id, mes, anio, estado, tipo
Success:
- 200: BitacoraResumen[]

Errors:
- 422: error de validación en query (`tecnico_id` uuid, `mes` 1-12, `anio` 1900-3000, longitud de `estado`/`tipo`)

### GET /bitacoras/:id
Success:
- 200: Bitacora
Errors:
- 404
- 422: error de validación (uuid inválido)

### PATCH /bitacoras/:id
Request body:
```json
{ "observaciones": "string?", "actividades_realizadas": "string?" }
```
Success:
- 200: Bitacora
Errors:
- 404
- 422: error de validación (uuid inválido o longitudes excedidas)

### PATCH /bitacoras/:id/pdf-config
Request body:
```json
{ "pdf_edicion": { "any": "value" } }
```
Success:
- 200: { id, pdf_edicion, updated_at }
Errors:
- 404
- 422: error de validación (uuid inválido o body inválido)

### GET /bitacoras/:id/pdf
Success:
- 200: application/pdf (inline)
Errors:
- 404
- 422: error de validación (uuid inválido)

### GET /bitacoras/:id/pdf/descargar
Success:
- 200: application/pdf (attachment)
Errors:
- 404
- 422: error de validación (uuid inválido)

### POST /bitacoras/:id/pdf/imprimir
Success:
- 200: application/pdf
Errors:
- 404
- 422: error de validación (uuid inválido)

### GET /bitacoras/:id/versiones
Success:
- 200: PdfVersion[]
Errors:
- 404
- 422: error de validación (uuid inválido)

## Reportes
Roles: administrador, coordinador

### GET /reportes/mensual
Query params optional: mes, anio
Success:
- 200: { mes, anio, tecnicos }

Errors:
- 422: error de validación (`mes` 1-12, `anio` >= 1900)

### GET /reportes/tecnico/:id
Query params optional: desde, hasta
Success:
- 200: { tecnico_id, total, bitacoras }
Errors:
- 404: { "error": "Técnico no encontrado o sin permisos" }
- 422: error de validación (uuid inválido o fechas con formato incorrecto)

## Notificaciones
Roles: administrador, tecnico

### GET /notificaciones
Success:
- 200: Notificacion[]

### PATCH /notificaciones/:id/leer
Success:
- 200: `{ "message": "Marcada como leída", "notificacion": { "id": "uuid", "destino_id": "uuid", "tipo": "string", "titulo": "string", "leido": true, "created_at": "ISO datetime" } }`
Errors:
- 404: `{ "error": "Notificación no encontrada" }`
- 422: error de validación (uuid inválido)

### PATCH /notificaciones/leer-todas
Success:
- 200: { "message": "Todas marcadas como leídas" }

## Localidades

### GET /localidades
Roles: administrador, coordinador
Success:
- 200: Localidad[]

### POST /localidades
Role: administrador
Request body:
```json
{ "zona_id": "uuid?", "municipio": "string", "nombre": "string", "cp": "12345?" }
```
Success:
- 201: Localidad
Errors:
- 400: { "error": "Zona no encontrada" }

### PATCH /localidades/:id
Role: administrador
Same fields as POST, optional.
Success:
- 200: Localidad
Errors:
- 400, 404
- 422: error de validación

### DELETE /localidades/:id
Role: administrador
Success:
- 200: { "message": "Localidad desactivada" }
Errors:
- 404: `{ "error": "Localidad no encontrada" }`
- 409: `{ "error": "No se puede desactivar una localidad con beneficiarios activos" }`
- 422: error de validación (uuid inválido)

## Cadenas Productivas
Role required: administrador

### GET /cadenas-productivas
Success:
- 200: Cadena[] (solo activas)

### POST /cadenas-productivas
Request body:
```json
{ "nombre": "string", "descripcion": "string?" }
```
Success:
- 201: Cadena

### PATCH /cadenas-productivas/:id
Request body:
```json
{ "nombre": "string?", "descripcion": "string?" }
```
Success:
- 200: Cadena
Errors:
- 404: `{ "error": "Cadena no encontrada" }`
- 422: error de validación

### DELETE /cadenas-productivas/:id
Success:
- 200: `{ "message": "Cadena desactivada" }`
Errors:
- 404: `{ "error": "Cadena no encontrada" }`
- 422: error de validación (uuid inválido)

## Actividades

### GET /actividades
Roles: administrador, coordinador
Success:
- 200: Actividad[] (solo activas)

### POST /actividades
Role: administrador
Request body:
```json
{ "nombre": "string", "descripcion": "string?" }
```
Success:
- 201: Actividad

### PATCH /actividades/:id
Role: administrador
Request body:
```json
{ "nombre": "string?", "descripcion": "string?" }
```
Success:
- 200: Actividad
Errors:
- 404: `{ "error": "Actividad no encontrada" }`
- 422: error de validación

### DELETE /actividades/:id
Role: administrador
Success:
- 200: `{ "message": "Actividad desactivada" }`
Errors:
- 404: `{ "error": "Actividad no encontrada" }`
- 422: error de validación (uuid inválido)

## Zonas
Role required: administrador

### GET /zonas
Success:
- 200: Zona[]

### POST /zonas
Request body:
```json
{ "nombre": "string", "descripcion": "string?" }
```
Success:
- 201: Zona

### PATCH /zonas/:id
Request body:
```json
{ "nombre": "string?", "descripcion": "string?" }
```
Success:
- 200: Zona
Errors:
- 404
- 422: error de validación

### DELETE /zonas/:id
Success:
- 200: { "message": "Zona desactivada" }
Errors:
- 404
- 422: error de validación (uuid inválido)

## Configuraciones

### GET /configuraciones
Role: administrador
Success:
- 200: Configuracion[]

### GET /configuraciones/:clave
Roles: administrador, coordinador
Success:
- 200: Configuracion
Errors:
- 404

### PUT /configuraciones/:clave
Role: administrador
Request body:
```json
{ "valor": { "any": "json" } }
```
Success:
- 200: Configuracion
Errors:
- 404

## Documentos Plantilla

### GET /documentos-plantilla
Role: administrador
Success:
- 200: DocumentoPlantilla[]

### GET /documentos-plantilla/activos
Roles: administrador, coordinador
Success:
- 200: DocumentoPlantilla[]

### POST /documentos-plantilla
Role: administrador
Request body:
```json
{
  "nombre": "string",
  "descripcion": "string?",
  "obligatorio": true,
  "orden": 0,
  "configuracion": {}
}
```
Success:
- 201: DocumentoPlantilla

### PATCH /documentos-plantilla/:id
Role: administrador
Request body: same fields as POST, optional
Success:
- 200: DocumentoPlantilla
Errors:
- 404
- 422: error de validación

### DELETE /documentos-plantilla/:id
Role: administrador
Success:
- 200: { "message": "Documento desactivado" }
Errors:
- 404
- 422: error de validación (uuid inválido)

## Documentos PDF
Role required: administrador

### GET /documentos-pdf
Success:
- 200: DocumentoPdf[]

### POST /documentos-pdf
FormData fields: archivo, clave, nombre, descripcion?
Success:
- 201: DocumentoPdf
Errors:
- 400: { "error": "archivo, clave y nombre son requeridos" }
- 400: { "error": "El archivo debe ser PDF" }

### PATCH /documentos-pdf/:id
Request body:
```json
{ "clave": "string?", "nombre": "string?", "descripcion": "string?", "activo": true }
```
Success:
- 200: DocumentoPdf
Errors:
- 404
- 422: error de validación

### DELETE /documentos-pdf/:id
Success:
- 200: { "message": "Documento PDF desactivado" }
Errors:
- 404
- 422: error de validación (uuid inválido)

## Archive
Role required: administrador

### GET /archive
Success:
- 200: ArchiveLog[]

### GET /archive/:periodo/descargar
Success:
- 200: application/octet-stream
Errors:
- 400: { "error": "No hay URL de descarga disponible" }
- 404: { "error": "Paquete no disponible" }
- 413: { "error": "Archivo demasiado grande" }
- 502: { "error": "Error al obtener el archivo" }
- 422: error de validación (periodo inválido, formato esperado `YYYY-MM`)

### POST /archive/:periodo/confirmar
Request body:
```json
{ "confirmar": true }
```
Success:
- 200: { "message": string }
Errors:
- 404: { "error": "No se encontró archivado para ese periodo" }
- 422: error de validación (periodo inválido, formato esperado `YYYY-MM`)

### POST /archive/:periodo/forzar
Success:
- 200: { "message": string }
Errors:
- 409: { "error": "Ya existe un archivado en progreso para ese periodo" }
- 422: error de validación (periodo inválido, formato esperado `YYYY-MM`)

## Dashboard

### GET /dashboard/coordinador
Role required: coordinador
Success:
- 200: {
  "resumen": {
    "tecnicos": number,
    "beneficiarios": number,
    "bitacoras": number,
    "bitacoras_cerradas": number,
    "bitacoras_borrador": number
  },
  "tecnicos": array
}
