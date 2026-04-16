# Documentación API Completa - Todos Endpoints con Body/Response/Errores

**Base:** `/api/v1` | Auth Bearer JWT (except auth) | Rol perms in-line.

## Autenticación
**POST /auth/verify-codigo-acceso** - Login
- **Body**: `{"correo": "user@ej.com", "codigo_acceso": "12345"}`
- **200 OK**: `{"token": "jwt...", "usuario": {"id", "nombre", "rol"}}` - Inicia sesión
- **401**: `{"error": "Credenciales inválidas"}` - Wrong code/email
- **Web**: Form → store token → dashboard

**POST /auth/logout** - Close session
- **Body**: None
- **200**: `{"message": "Sesión cerrada"}`
- **Web**: Clear storage → login page

## Usuarios (Admin CRUD)
**GET /usuarios** - List all
- **200**: Array `[{"id", "nombre", "correo", "rol", "activo", "codigo_acceso"}]`
- **Web**: Table all users

**POST /usuarios** - Create
- **Body**: `{"correo", "nombre", "rol": "admin|coordinador|tecnico"}`
- **201**: `{"id", "nombre", "rol", "activo", "codigo_acceso"}` (auto-gen)
- **409**: `{"error": "Correo registrado"}`
- **Web**: Modal → toast codigo

**PATCH /usuarios/:id** - Update
- **Body**: `{"nombre"?, "correo"?, "rol"?, "codigo_acceso"?, "activo"?}`
- **200**: Updated user
- **400**: `{"error": "Código debe 5/6 dig rol"}`
- **409**: `{"error": "Correo dup"}`
- **Web**: Edit modal validate length

**DELETE /usuarios/:id** - Soft deactivate
- **200**: `{"message": "Usuario desactivado"}`
- **Web**: Confirm → table filter active=false

**DELETE /usuarios/:id/force** - Hard + cascade
- **200**: `{"message": "Usuario eliminado permanentemente"}`
- **Web**: Super confirm + reload list

## Tecnicos (Admin/Coordinador own)
**GET /tecnicos** - List own/team
- **200**: Array `[{"id", "nombre", "correo", "coordinador_nombre", "codigo_acceso", "activo"}]`
- **Web**: Table filter coordinador

**GET /tecnicos/:id** - Detail + asigns
- **200**: User + `"asignaciones": [...]`
- **403**: No own

**POST /tecnicos** - Create own
- **Body**: `{"nombre", "correo", "telefono"?, "coordinador_id", "fecha_limite"?:}`
- **201**: `{"id", ..., "detalle": {}, "codigo": "5dig"}`
- **409**: Email dup
- **Web**: Modal auto-fill own coord

**PATCH /tecnicos/:id** - Update own
- **Body**: Same POST optional
- **200**: Updated
- **403**: Not own coord

**POST /tecnicos/:id/codigo** - Regen 5dig (admin)
- **200**: `{"message": "Regenerado", "codigo": "54321"}`
- **Web**: Btn row → toast copy clipboard

**POST /aplicar-cortes** - Bulk suspend expired
- **200**: `{"message": "Corte 3 tecnicos", "tecnicos": []}`
- **Web**: Schedule cron-like btn

**POST /tecnicos/:id/cerrar-corte** - Suspend specific
- **200**: `{"message": "Cerrado", "tecnico": {...}}`
- **403**: Not own

**DELETE /tecnicos/:id** - Deactivate own
- **200**: `{"message": "Desactivado"}`
- **Web**: Confirm cascade warn

## Beneficiarios (All own tecnico)
**GET /beneficiarios** - List own
- **200**: Array full fields
- **Web**: Table map coord_parcela

**GET /beneficiarios/:id** - Detail + relaciones
- **200**: + `"cadenas": [], "documentos": []`
- **404**: Not found/perm

**POST /beneficiarios** - Create
- **Body**: `{"nombre", "municipio", "curp"?, "localidad_id"?, "direccion"?, "cp"?, "telefonos"?, "coord_parcela": "x,y", "tecnico_id"?:}`
- **201**: New
- **400**: Coord format/local invalid
- **Web**: Geocode input → Leaflet marker

**PATCH /beneficiarios/:id** - Update/reasign
- **Body**: Same optional
- **200**: Updated
- **403**: Not own tecnico

**DELETE /beneficiarios/:id** - Soft
- **200**: `{"message": "Desactivado"}`
- **Web**: Confirm warn asigns

**POST /beneficiarios/:id/cadenas** (admin)
- **Body**: `{"cadena_ids": []}`
- **200**: `{"message": "Actualizadas"}`

**POST /beneficiarios/:id/documentos** - Upload
- **Multipart**: archivo, tipo
- **201**: New doc
- **Web**: Drag-drop → gallery

**GET /beneficiarios/:id/documentos**
- **200**: Array docs

**POST/GET/DEL /beneficiarios/:id/foto-rostro** - Photo
- **200/DEL null URL**
- **Web**: Camera/cropper → img preview

Same **firma**

## Asignaciones
**GET /asignaciones/beneficiario** `?tecnico_id=&beneficiario_id=&activo=`
- **200**: Array `{"tecnico_nombre", "beneficiario_nombre", "activo"}`
- **Web**: Matrix checkbox assign

**POST /asignaciones/beneficiario** `{"tecnico_id", "beneficiario_id"}`
- **201**: New
- **403**: Coord not own tecnico

**PATCH/DELETE /asignaciones/beneficiario/:id** - Toggle/remove
- **200**: `{"message": "Eliminada"}`

Same **actividad**, **coordinador-tecnico**

## Actividades (Admin/Coordinador)
**GET /actividades** - List
**POST/PATCH/DEL /actividades/:id**
- **Body**: `{"nombre", "descripcion"?:}`
- **200/201**: CRUD simple
- **Web**: List select multi-asign

## Cadenas (Admin/Coordinador)
Same actividades structure /cadenas-productivas

## Localidades (Admin/Coordinador)
**POST/PATCH** `{"zona_id"?, "municipio", "nombre", "cp":5dig}`
- **Web**: Zonas filter CP search

## Bitacoras/Reportes/Dashboard - Similar list/detail/stats
**Web**: Calendar/charts PDF download btns

**All DELETEs**: Confirm UI, safe cascade/soft.

**Precisa/completa para web dev!** 🎯
