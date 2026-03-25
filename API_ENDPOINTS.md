# API Contract for Frontend

Base URL: /api/v1
Auth header for protected routes: Authorization: Bearer <token>

Error shape (general):
- { "error": string }
- Some endpoints also return { "message": string }

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

### GET /usuarios
Success:
- 200: Usuario[]

### POST /usuarios
Request body:
```json
{
  "correo": "string",
  "nombre": "string",
  "rol": "tecnico|coordinador|administrador",
  "telefono": "string?"
}
```
Success:
- 201: Usuario (includes generated codigo_acceso)
Errors:
- 409: { "error": "El correo ya está registrado" }

### PATCH /usuarios/:id
Request body (partial):
```json
{
  "nombre": "string?",
  "correo": "string?",
  "rol": "tecnico|coordinador|administrador?",
  "codigo_acceso": "string?",
  "telefono": "string?"
}
```
Success:
- 200: Usuario
Errors:
- 400: { "error": string }
- 404: { "error": "Usuario no encontrado" }
- 409: { "error": "El correo ya está registrado" }

### DELETE /usuarios/:id
Success:
- 200: { "message": "Usuario desactivado" }
Errors:
- 400: { "error": "No puedes desactivar tu propia cuenta" }
- 404: { "error": "Usuario no encontrado" }

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

### POST /tecnicos
Role: administrador
Not available.
Errors:
- 409: { "error": "La creación de técnicos se realiza desde /usuarios con rol 'tecnico'." }

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

### POST /tecnicos/:id/codigo
Role: administrador
Success:
- 200: { "message": "Código generado y enviado", "codigo": "12345" }
Errors:
- 404: { "error": "Técnico no encontrado" }

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

### DELETE /tecnicos/:id
Role: administrador
Success:
- 200: { "message": "Técnico desactivado" }
Errors:
- 404: { "error": "Técnico no encontrado" }

## Asignaciones
Role required: administrador

### GET /asignaciones/coordinador-tecnico?tecnico_id=<uuid>
Success:
- 200: TecnicoDetalle
Errors:
- 400: { "error": "tecnico_id es requerido" }
- 404: { "error": "Asignación no encontrada" }

### POST /asignaciones/coordinador-tecnico
Request body:
```json
{ "tecnico_id": "uuid", "coordinador_id": "uuid", "fecha_limite": "ISO datetime" }
```
Success:
- 201: TecnicoDetalle
Errors:
- 400: { "error": "Coordinador inválido o inactivo" }
- 400: { "error": "Técnico inválido o inactivo" }

### DELETE /asignaciones/coordinador-tecnico/:tecnico_id
Success:
- 200: { "message": "Asignación removida" }
Errors:
- 404: { "error": "Asignación no encontrada" }

### POST /asignaciones/beneficiario
Request body:
```json
{ "tecnico_id": "uuid", "beneficiario_id": "uuid" }
```
Success:
- 201: AsignacionBeneficiario

### DELETE /asignaciones/beneficiario/:id
Success:
- 200: { "message": "Asignación removida" }
Errors:
- 404: { "error": "Asignación no encontrada" }

### POST /asignaciones/actividad
Request body:
```json
{ "tecnico_id": "uuid", "actividad_id": "uuid" }
```
Success:
- 201: AsignacionActividad

### DELETE /asignaciones/actividad/:id
Success:
- 200: { "message": "Asignación de actividad removida" }
Errors:
- 404: { "error": "Asignación de actividad no encontrada" }

## Beneficiarios
Roles: administrador, coordinador

### GET /beneficiarios
Success:
- 200: Beneficiario[]

### GET /beneficiarios/:id
Success:
- 200: BeneficiarioDetalle (includes cadenas and documentos)
Errors:
- 404: { "error": "Beneficiario no encontrado" }

### POST /beneficiarios
Request body:
```json
{
  "nombre": "string",
  "municipio": "string",
  "localidad": "string?",
  "localidad_id": "uuid?",
  "direccion": "string?",
  "cp": "string?",
  "telefono_principal": "string?",
  "telefono_secundario": "string?",
  "coord_parcela": "x,y?",
  "tecnico_id": "uuid"
}
```
Success:
- 201: Beneficiario
Errors:
- 400: { "error": string }
- 403: { "error": "Sin permisos para asignar este técnico" }

### PATCH /beneficiarios/:id
Same fields as POST, all optional.
Success:
- 200: Beneficiario
Errors:
- 400, 403, 404

### POST /beneficiarios/:id/cadenas
Role: administrador
Request body:
```json
{ "cadena_ids": ["uuid"] }
```
Success:
- 200: { "message": "Cadenas actualizadas" }

### POST /beneficiarios/:id/documentos
FormData fields: archivo, tipo
Success:
- 201: Documento
Errors:
- 400: { "error": "Archivo y tipo son requeridos" }

### GET /beneficiarios/:id/documentos
Success:
- 200: Documento[]

## Bitacoras
Roles: administrador, coordinador

### GET /bitacoras
Query params (all optional): tecnico_id, mes, anio, estado, tipo
Success:
- 200: BitacoraResumen[]

### GET /bitacoras/:id
Success:
- 200: Bitacora
Errors:
- 404

### PATCH /bitacoras/:id
Request body:
```json
{ "observaciones": "string?", "actividades_realizadas": "string?" }
```
Success:
- 200: Bitacora
Errors:
- 404

### PATCH /bitacoras/:id/pdf-config
Request body:
```json
{ "pdf_edicion": { "any": "value" } }
```
Success:
- 200: { id, pdf_edicion, updated_at }
Errors:
- 404

### GET /bitacoras/:id/pdf
Success:
- 200: application/pdf (inline)
Errors:
- 404

### GET /bitacoras/:id/pdf/descargar
Success:
- 200: application/pdf (attachment)
Errors:
- 404

### POST /bitacoras/:id/pdf/imprimir
Success:
- 200: application/pdf
Errors:
- 404

### GET /bitacoras/:id/versiones
Success:
- 200: PdfVersion[]
Errors:
- 404

## Reportes
Roles: administrador, coordinador

### GET /reportes/mensual
Query params optional: mes, anio
Success:
- 200: { mes, anio, tecnicos }

### GET /reportes/tecnico/:id
Query params optional: desde, hasta
Success:
- 200: { tecnico_id, total, bitacoras }
Errors:
- 404: { "error": "Técnico no encontrado o sin permisos" }

## Notificaciones
Roles: administrador, tecnico

### GET /notificaciones
Success:
- 200: Notificacion[]

### PATCH /notificaciones/:id/leer
Success:
- 200: { "message": "Marcada como leída" }

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

### DELETE /localidades/:id
Role: administrador
Success:
- 200: { "message": "Localidad desactivada" }
Errors:
- 404

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

### DELETE /zonas/:id
Success:
- 200: { "message": "Zona desactivada" }
Errors:
- 404

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

### DELETE /documentos-plantilla/:id
Role: administrador
Success:
- 200: { "message": "Documento desactivado" }
Errors:
- 404

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

### PATCH /documentos-pdf/:id
Request body:
```json
{ "clave": "string?", "nombre": "string?", "descripcion": "string?", "activo": true }
```
Success:
- 200: DocumentoPdf
Errors:
- 404

### DELETE /documentos-pdf/:id
Success:
- 200: { "message": "Documento PDF desactivado" }
Errors:
- 404

## Archive
Role required: administrador

### GET /archive
Success:
- 200: ArchiveLog[]

### GET /archive/:periodo/descargar
Success:
- 200: application/octet-stream
Errors:
- 400, 404, 502

### POST /archive/:periodo/confirmar
Request body:
```json
{ "confirmar": true }
```
Success:
- 200: { "message": string }
Errors:
- 404

### POST /archive/:periodo/forzar
Success:
- 200: { "message": string }
Errors:
- 409

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
