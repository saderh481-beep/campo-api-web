# Documentación de API - Campo API Web

Base URL: `https://tu-api.com/api/v1`

Todos los endpoints requieren autenticación Bearer Token excepto los de autenticación.

## Arquitectura

La API sigue los principios SOLID con la siguiente estructura:

### Modelos (`src/models/`)
Capa de acceso a datos con consultas SQL parametrizadas:

| Modelo | Descripción |
|--------|-------------|
| `usuarios.model.ts` | Gestión de usuarios |
| `tecnicos.model.ts` | Gestión de técnicos |
| `tecnico-detalles.model.ts` | Detalles técnicos y asignaciones |
| `beneficiarios.model.ts` | Beneficiarios con transacciones |
| `beneficiario_cadenas.model.ts` | Cadenas por beneficiario |
| `documentos.model.ts` | Documentos de beneficiarios |
| `documentos_pdf.model.ts` | PDFs descargables |
| `bitacoras.model.ts` | Bitácoras |
| `cadenas.model.ts` | Cadenas productivas |
| `actividades.model.ts` | Actividades |
| `localidades.model.ts` | Localidades |
| `zonas.model.ts` | Zonas |
| `asignaciones.model.ts` | Asignaciones (coordinador-técnico, beneficiario, actividad) |
| `configuraciones.model.ts` | Configuraciones del sistema |
| `notificaciones.model.ts` | Notificaciones |
| `auth_logs.model.ts` | Logs de autenticación |
| `reportes.model.ts` | Reportes |
| `dashboard.model.ts` | Estadísticas |
| `archive.model.ts` | Archivos |

### Repositorios (`src/repositories/`)
Lógica de negocio para operaciones complejas:

- `bitacora.repository.ts` - Bitácoras con filtros y control de acceso

### Características de la base de datos

- **Consultas parametrizadas**: Previenen inyección SQL
- **Transacciones**: Para operaciones multi-tabla (beneficiarios, asignaciones)
- **Validación de relaciones**: Verificación de IDs antes de crear/actualizar
- **Soft deletes**: Campos `activo` para eliminación lógica
- **Índices**: Utiliza índices existentes para optimizar consultas
- **Control de acceso**: Verificación de coordinador_id para coordinadores

---

## Autenticación

### POST /auth/verify-codigo-acceso
Iniciar sesión con correo y código de acceso.

**Request Body:**
```json
{
  "correo": "admin@campo.local",
  "codigo_acceso": "654321"
}
```

**Response (200):**
```json
{
  "token": "uuid-token-aqui",
  "usuario": {
    "id": "uuid-usuario",
    "nombre": "Admin",
    "correo": "admin@campo.local",
    "rol": "admin"
  }
}
```

**Errores:**
- `401`: Credenciales inválidas
- `401`: periodo_vencido - Tu período de acceso ha concluido
- `401`: periodo_no_configurado - No hay fecha de corte global configurada

---

### POST /auth/logout
Cerrar sesión.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Sesión cerrada"
}
```

---

## Usuarios

### GET /usuarios
Listar todos los usuarios (solo admin).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "correo": "admin@campo.local",
    "nombre": "Admin",
    "rol": "admin",
    "activo": true,
    "created_at": "2026-04-06T12:00:00Z",
    "updated_at": "2026-04-06T12:00:00Z"
  }
]
```

---

### POST /usuarios
Crear nuevo usuario.

**Headers:** `Authorization: Bearer <token>` (admin)

**Request Body:**
```json
{
  "correo": "nuevo@campo.local",
  "nombre": "Nuevo Usuario",
  "rol": "tecnico"  // "admin" | "coordinador" | "tecnico"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "correo": "nuevo@campo.local",
  "nombre": "Nuevo Usuario",
  "rol": "tecnico",
  "activo": true,
  "codigo": "12345"  // Código generado automáticamente
}
```

**Errores:**
- `409`: El correo ya está registrado

---

### PATCH /usuarios/:id
Actualizar usuario.

**Headers:** `Authorization: Bearer <token>` (admin)

**Request Body (todos los campos opcionales):**
```json
{
  "nombre": "Nombre Actualizado",
  "correo": "nuevo@campo.local",
  "rol": "coordinador",
  "codigo_acceso": "99999",
  "activo": true
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "correo": "nuevo@campo.local",
  "nombre": "Nombre Actualizado",
  "rol": "coordinador",
  "activo": true
}
```

**Errores:**
- `409`: El correo ya está registrado
- `404`: Usuario no encontrado

---

### DELETE /usuarios/:id
Desactivar usuario (soft delete).

**Headers:** `Authorization: Bearer <token>` (admin)

**Response (200):**
```json
{
  "message": "Usuario desactivado"
}
```

**Errores:**
- `404`: Usuario no encontrado

---

### DELETE /usuarios/:id/force
Eliminar usuario físicamente.

**Headers:** `Authorization: Bearer <token>` (admin)

**Response (200):**
```json
{
  "message": "Usuario eliminado"
}
```

**Errores:**
- `404`: Usuario no encontrado

---

## Técnicos

### GET /tecnicos
Listar técnicos.

**Headers:** `Authorization: Bearer <token>` (admin, coordinador)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "nombre": "Técnico 1",
    "correo": "tecnico1@campo.local",
    "telefono": "1234567890",
    "coordinador_id": "uuid-coordinador",
    "coordinador_nombre": "Coordinador 1",
    "fecha_limite": "2026-12-31T23:59:59Z",
    "estado_corte": "en_servicio",
    "codigo_acceso": "12345",
    "activo": true
  }
]
```

---

### GET /tecnicos/:id
Obtener técnico por ID.

**Headers:** `Authorization: Bearer <token>` (admin, coordinador)

**Response (200):**
```json
{
  "id": "uuid",
  "nombre": "Técnico 1",
  "correo": "tecnico1@campo.local",
  "telefono": "1234567890",
  "coordinador_id": "uuid",
  "coordinador_nombre": "Coordinador",
  "fecha_limite": "2026-12-31T23:59:59Z",
  "estado_corte": "en_servicio",
  "asignaciones": [
    {
      "id": "uuid",
      "coordinador_id": "uuid",
      "tecnico_id": "uuid",
      "fecha_limite": "2026-12-31T23:59:59Z",
      "estado_corte": "en_servicio",
      "activo": true
    }
  ]
}
```

**Errores:**
- `404`: Técnico no encontrado
- `403`: Sin permisos

---

### PATCH /tecnicos/:id
Actualizar técnico.

**Headers:** `Authorization: Bearer <token>` (admin)

**Request Body:**
```json
{
  "nombre": "Nombre actualizado",
  "correo": "nuevo@campo.local",
  "telefono": "1234567890",
  "coordinador_id": "uuid-coordinador",
  "fecha_limite": "2026-12-31T23:59:59Z"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "nombre": "Nombre actualizado",
  "coordinador_id": "uuid",
  "estado_corte": "en_servicio"
}
```

**Errores:**
- `409`: El correo ya está registrado
- `400`: Coordinador inválido o inactivo
- `404`: Técnico no encontrado

---

### POST /tecnicos/:id/codigo
Regenerar código de acceso.

**Headers:** `Authorization: Bearer <token>` (admin)

**Response (200):**
```json
{
  "message": "Código regenerado",
  "codigo": "54321"
}
```

---

### POST /tecnicos/aplicar-cortes
Aplicar corte a técnicos vencidos.

**Headers:** `Authorization: Bearer <token>` (admin)

**Response (200):**
```json
{
  "message": "Corte aplicado a 3 técnico(s)",
  "tecnicos": [
    { "id": "uuid", "nombre": "Técnico 1" }
  ]
}
```

---

### POST /tecnicos/:id/cerrar-corte
Cerrar período de corte.

**Headers:** `Authorization: Bearer <token>` (admin, coordinador)

**Response (200):**
```json
{
  "message": "Período cerrado",
  "tecnico": {
    "id": "uuid",
    "estado_corte": "suspendido"
  }
}
```

---

### DELETE /tecnicos/:id
Desactivar técnico.

**Headers:** `Authorization: Bearer <token>` (admin)

**Response (200):**
```json
{
  "message": "Técnico desactivado"
}
```

---

## Beneficiarios

### GET /beneficiarios
Listar beneficiarios.

**Headers:** `Authorization: Bearer <token>` (admin, coordinador)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "tecnico_id": "uuid",
    "nombre": "Beneficiario 1",
    "municipio": "Mun1",
    "localidad": "Loc1",
    "localidad_id": "uuid",
    "direccion": "Dirección 1",
    "cp": "12345",
    "telefono_principal": "1234567890",
    "telefono_secundario": "0987654321",
    "coord_parcela": "(20.123, -99.456)",
    "activo": true,
    "created_at": "2026-04-06T12:00:00Z",
    "updated_at": "2026-04-06T12:00:00Z"
  }
]
```

---

### GET /beneficiarios/:id
Obtener beneficiario por ID.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "uuid",
  "tecnico_id": "uuid",
  "nombre": "Beneficiario 1",
  "municipio": "Mun1",
  "localidad": "Loc1",
  "localidad_id": "uuid",
  "direccion": "Dirección 1",
  "cp": "12345",
  "telefono_principal": "1234567890",
  "telefono_secundario": "0987654321",
  "coord_parcela": "(20.123, -99.456)",
  "activo": true,
  "cadenas": [
    { "id": "uuid", "nombre": "Cadena 1" }
  ],
  "documentos": [
    {
      "id": "uuid",
      "tipo": "identificacion",
      "nombre_original": "archivo.pdf",
      "r2_key": "https://...",
      "sha256": "abc123...",
      "bytes": 1024,
      "subido_por": "uuid",
      "created_at": "2026-04-06T12:00:00Z"
    }
  ]
}
```

**Errores:**
- `404`: Beneficiario no encontrado

---

### POST /beneficiarios
Crear beneficiario.

**Headers:** `Authorization: Bearer <token>` (admin, coordinador)

**Request Body:**
```json
{
  "nombre": "Nuevo Beneficiario",
  "municipio": "Municipio",
  "localidad": "Localidad",
  "localidad_id": "uuid",
  "direccion": "Dirección",
  "cp": "12345",
  "telefono_principal": "1234567890",
  "telefono_secundario": "0987654321",
  "coord_parcela": "20.123,-99.456",
  "tecnico_id": "uuid"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "tecnico_id": "uuid",
  "nombre": "Nuevo Beneficiario",
  "municipio": "Municipio",
  "localidad": "Localidad",
  "localidad_id": "uuid",
  "activo": true
}
```

**Errores:**
- `400`: coord_parcela debe tener formato 'x,y'
- `400`: Localidad no encontrada o inactiva
- `400`: Técnico no encontrado o inactivo
- `403`: Sin permisos para asignar este técnico

---

### PATCH /beneficiarios/:id
Actualizar beneficiario.

**Headers:** `Authorization: Bearer <token>` (admin, coordinador)

**Request Body:**
```json
{
  "nombre": "Nombre actualizado",
  "municipio": "Nuevo municipio",
  "localidad": "Nueva localidad",
  "localidad_id": "uuid",
  "direccion": "Nueva dirección",
  "cp": "54321",
  "telefono_principal": "1112223333",
  "telefono_secundario": "4445556666",
  "coord_parcela": "20.123,-99.456",
  "tecnico_id": "uuid"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "nombre": "Nombre actualizado",
  ...
}
```

---

### DELETE /beneficiarios/:id
Desactivar beneficiario (soft delete).

**Headers:** `Authorization: Bearer <token>` (admin, coordinador)

**Response (200):**
```json
{
  "message": "Beneficiario desactivado"
}
```

---

### POST /beneficiarios/:id/cadenas
Asignar cadenas productivas.

**Headers:** `Authorization: Bearer <token>` (admin)

**Request Body:**
```json
{
  "cadena_ids": ["uuid-cadena-1", "uuid-cadena-2"]
}
```

**Response (200):**
```json
{
  "message": "Cadenas actualizadas"
}
```

**Errores:**
- `400`: Una o más cadenas no existen o están inactivas

---

### POST /beneficiarios/:id/documentos
Subir documento.

**Headers:** `Authorization: Bearer <token>` (admin, coordinator)

**Content-Type:** multipart/form-data

**Form Data:**
- `archivo`: File
- `tipo`: string (ej: "identificacion", "comprobante", etc.)

**Response (201):**
```json
{
  "id": "uuid",
  "tipo": "identificacion",
  "nombre_original": "archivo.pdf",
  "r2_key": "https://...",
  "sha256": "abc123...",
  "bytes": 1024,
  "subido_por": "uuid",
  "created_at": "2026-04-06T12:00:00Z"
}
```

**Errores:**
- `400`: Archivo y tipo son requeridos
- `404`: Beneficiario no encontrado

---

### GET /beneficiarios/:id/documentos
Listar documentos.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "tipo": "identificacion",
    "nombre_original": "archivo.pdf",
    "r2_key": "https://...",
    "sha256": "abc123...",
    "bytes": 1024,
    "subido_por": "uuid",
    "created_at": "2026-04-06T12:00:00Z"
  }
]
```

---

## Asignaciones

### GET /asignaciones/coordinador-tecnico
Listar asignaciones coordinador-técnico.

**Headers:** `Authorization: Bearer <token>` (admin)

**Query:** `?tecnico_id=uuid` (opcional)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "coordinador_id": "uuid",
    "coordinador_nombre": "Coordinador 1",
    "tecnico_id": "uuid",
    "tecnico_nombre": "Técnico 1",
    "fecha_limite": "2026-12-31T23:59:59Z",
    "estado_corte": "en_servicio",
    "activo": true
  }
]
```

---

### GET /asignaciones/coordinador-tecnico/:tecnico_id
Obtener asignación por técnico.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "uuid",
  "coordinador_id": "uuid",
  "tecnico_id": "uuid",
  "fecha_limite": "2026-12-31T23:59:59Z",
  "estado_corte": "en_servicio",
  "activo": true
}
```

---

### POST /asignaciones/coordinador-tecnico
Crear asignación coordinador-técnico.

**Headers:** `Authorization: Bearer <token>` (admin)

**Request Body:**
```json
{
  "tecnico_id": "uuid",
  "coordinador_id": "uuid",
  "fecha_limite": "2026-12-31T23:59:59Z"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "tecnico_id": "uuid",
  "coordinador_id": "uuid",
  "fecha_limite": "2026-12-31T23:59:59Z",
  "estado_corte": "en_servicio",
  "activo": true
}
```

---

### PATCH /asignaciones/coordinador-tecnico/:tecnico_id
Actualizar asignación.

**Headers:** `Authorization: Bearer <token>` (admin)

**Request Body:**
```json
{
  "coordinador_id": "uuid",
  "fecha_limite": "2026-12-31T23:59:59Z",
  "activo": false
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "tecnico_id": "uuid",
  "coordinador_id": "uuid",
  "activo": false
}
```

---

### DELETE /asignaciones/coordinador-tecnico/:tecnico_id
Eliminar asignación.

**Headers:** `Authorization: Bearer <token>` (admin)

**Response (200):**
```json
{
  "message": "Asignación eliminada"
}
```

---

### GET /asignaciones/beneficiario
Listar asignaciones beneficiario.

**Headers:** `Authorization: Bearer <token>` (admin)

**Query:** `?tecnico_id=uuid&beneficiario_id=uuid&activo=true`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "tecnico_id": "uuid",
    "tecnico_nombre": "Técnico 1",
    "beneficiario_id": "uuid",
    "beneficiario_nombre": "Beneficiario 1",
    "asignado_por": "uuid",
    "asignado_en": "2026-04-06T12:00:00Z",
    "activo": true
  }
]
```

---

### POST /asignaciones/beneficiario
Crear asignación beneficiario-técnico.

**Headers:** `Authorization: Bearer <token>` (admin)

**Request Body:**
```json
{
  "tecnico_id": "uuid",
  "beneficiario_id": "uuid"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "tecnico_id": "uuid",
  "beneficiario_id": "uuid",
  "asignado_por": "uuid",
  "asignado_en": "2026-04-06T12:00:00Z",
  "activo": true
}
```

**Errores:**
- `400`: Técnico inválido
- `404`: Beneficiario no encontrado

---

### DELETE /asignaciones/beneficiario/:id
Eliminar asignación beneficiario.

**Headers:** `Authorization: Bearer <token>` (admin)

**Response (200):**
```json
{
  "message": "Asignación eliminada"
}
```

---

### GET /asignaciones/actividad
Listar asignaciones actividad.

**Headers:** `Authorization: Bearer <token>` (admin)

**Query:** `?tecnico_id=uuid&actividad_id=uuid&activo=true`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "tecnico_id": "uuid",
    "tecnico_nombre": "Técnico 1",
    "actividad_id": "uuid",
    "actividad_nombre": "Actividad 1",
    "asignado_por": "uuid",
    "asignado_en": "2026-04-06T12:00:00Z",
    "activo": true
  }
]
```

---

### POST /asignaciones/actividad
Crear asignación actividad-técnico.

**Headers:** `Authorization: Bearer <token>` (admin)

**Request Body:**
```json
{
  "tecnico_id": "uuid",
  "actividad_id": "uuid"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "tecnico_id": "uuid",
  "actividad_id": "uuid",
  "asignado_por": "uuid",
  "asignado_en": "2026-04-06T12:00:00Z",
  "activo": true
}
```

---

### DELETE /asignaciones/actividad/:id
Eliminar asignación actividad.

**Headers:** `Authorization: Bearer <token>` (admin)

**Response (200):**
```json
{
  "message": "Asignación eliminada"
}
```

---

## Bitácoras

### GET /bitacoras
Listar bitácoras.

**Headers:** `Authorization: Bearer <token>` (admin, coordinador)

**Query:** `?tecnico_id=uuid&mes=4&anio=2026&estado=borrador&tipo=visita`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "tipo": "visita",
    "estado": "borrador",
    "fecha_inicio": "2026-04-06T12:00:00Z",
    "fecha_fin": "2026-04-06T14:00:00Z",
    "tecnico_nombre": "Técnico 1",
    "beneficiario_nombre": "Beneficiario 1",
    "cadena_nombre": "Cadena 1",
    "actividad_nombre": "Actividad 1"
  }
]
```

---

### GET /bitacoras/:id
Obtener bitácora por ID.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "uuid",
  "tipo": "visita",
  "tecnico_id": "uuid",
  "beneficiario_id": "uuid",
  "cadena_productiva_id": "uuid",
  "actividad_id": "uuid",
  "fecha_inicio": "2026-04-06T12:00:00Z",
  "fecha_fin": "2026-04-06T14:00:00Z",
  "actividades_desc": "Descripción de actividades",
  "recomendaciones": "Recomendaciones",
  "comentarios_beneficiario": "Comentarios",
  "coordinacion_interinst": false,
  "observaciones_coordinador": null,
  "estado": "borrador"
}
```

---

### PATCH /bitacoras/:id
Actualizar bitácora.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "observaciones": "Observaciones del coordinador",
  "actividades_realizadas": "Actividades realizadas actualizadas"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "observaciones_coordinador": "Observaciones del coordinador",
  "actividades_desc": "Actividades realizadas actualizadas",
  "updated_at": "2026-04-06T12:00:00Z"
}
```

---

### PATCH /bitacoras/:id/pdf-config
Actualizar configuración de PDF de bitácora.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "pdf_edicion": {
    "encabezado": "Nuevo encabezado",
    "pie": "Nuevo pie"
  }
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "pdf_edicion": {
    "encabezado": "Nuevo encabezado",
    "pie": "Nuevo pie"
  },
  "updated_at": "2026-04-06T12:00:00Z"
}
```

---

### GET /bitacoras/:id/pdf
Ver PDF de bitácora.

**Headers:** `Authorization: Bearer <token>`

**Response (200):** Content-Type: application/pdf

---

### GET /bitacoras/:id/pdf/descargar
Descargar PDF de bitácora.

**Headers:** `Authorization: Bearer <token>`

**Response (200):** Content-Type: application/pdf
- Header: `Content-Disposition: attachment; filename="bitacora-{id}.pdf"`

---

### POST /bitacoras/:id/pdf/imprimir
Generar versión impresa de PDF.

**Headers:** `Authorization: Bearer <token>`

**Response (200):** Content-Type: application/pdf

---

### GET /bitacoras/:id/versiones
Listar versiones PDF.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "version": 1,
    "r2_key": "https://...",
    "sha256": "abc123...",
    "inmutable": false,
    "generado_por": "uuid",
    "created_at": "2026-04-06T12:00:00Z"
  }
]
```

---

## Cadenas Productivas

### GET /cadenas-productivas
Listar cadenas.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "nombre": "Agricultura",
    "descripcion": "Descripción de la cadena",
    "activo": true,
    "created_at": "2026-04-06T12:00:00Z"
  }
]
```

---

### POST /cadenas-productivas
Crear cadena.

**Headers:** `Authorization: Bearer <token>` (admin)

**Request Body:**
```json
{
  "nombre": "Nueva Cadena",
  "descripcion": "Descripción"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "nombre": "Nueva Cadena",
  "descripcion": "Descripción",
  "activo": true
}
```

---

### PATCH /cadenas-productivas/:id
Actualizar cadena.

**Headers:** `Authorization: Bearer <token>` (admin)

**Request Body:**
```json
{
  "nombre": "Cadena actualizada",
  "descripcion": "Nueva descripción"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "nombre": "Cadena actualizada",
  "descripcion": "Nueva descripción",
  "activo": true
}
```

---

### DELETE /cadenas-productivas/:id
Desactivar cadena.

**Headers:** `Authorization: Bearer <token>` (admin)

**Response (200):**
```json
{
  "message": "Cadena desactivada"
}
```

---

## Actividades

### GET /actividades
Listar actividades.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "nombre": "Asesoría técnica",
    "descripcion": "Descripción de la actividad",
    "activo": true
  }
]
```

---

### POST /actividades
Crear actividad.

**Headers:** `Authorization: Bearer <token>` (admin)

**Request Body:**
```json
{
  "nombre": "Nueva Actividad",
  "descripcion": "Descripción"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "nombre": "Nueva Actividad",
  "descripcion": "Descripción",
  "activo": true
}
```

---

### PATCH /actividades/:id
Actualizar actividad.

**Headers:** `Authorization: Bearer <token>` (admin)

**Request Body:**
```json
{
  "nombre": "Actividad actualizada",
  "descripcion": "Nueva descripción"
}
```

---

### DELETE /actividades/:id
Desactivar actividad.

**Headers:** `Authorization: Bearer <token>` (admin)

**Response (200):**
```json
{
  "message": "Actividad desactivada"
}
```

---

## Localidades

### GET /localidades
Listar localidades.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "municipio": "Municipio 1",
    "nombre": "Localidad 1",
    "cp": "12345",
    "activo": true,
    "zona_id": "uuid"
  }
]
```

---

### POST /localidades
Crear localidad.

**Headers:** `Authorization: Bearer <token>` (admin)

**Request Body:**
```json
{
  "municipio": "Municipio",
  "nombre": "Localidad",
  "cp": "12345",
  "zona_id": "uuid"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "municipio": "Municipio",
  "nombre": "Localidad",
  "cp": "12345",
  "activo": true,
  "zona_id": "uuid"
}
```

---

### PATCH /localidades/:id
Actualizar localidad.

**Headers:** `Authorization: Bearer <token>` (admin)

**Request Body:**
```json
{
  "nombre": "Nuevo nombre",
  "cp": "54321",
  "zona_id": "uuid"
}
```

---

### DELETE /localidades/:id
Desactivar localidad.

**Headers:** `Authorization: Bearer <token>` (admin)

**Response (200):**
```json
{
  "message": "Localidad desactivada"
}
```

**Errores:**
- `409`: La localidad tiene beneficiarios activos

---

## Zonas

### GET /zonas
Listar zonas.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "nombre": "Zona Norte",
    "descripcion": "Descripción",
    "activo": true
  }
]
```

---

### POST /zonas
Crear zona.

**Headers:** `Authorization: Bearer <token>` (admin)

**Request Body:**
```json
{
  "nombre": "Nueva Zona",
  "descripcion": "Descripción"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "nombre": "Nueva Zona",
  "descripcion": "Descripción",
  "activo": true
}
```

---

### PATCH /zonas/:id
Actualizar zona.

**Headers:** `Authorization: Bearer <token>` (admin)

**Request Body:**
```json
{
  "nombre": "Zona actualizada",
  "descripcion": "Nueva descripción"
}
```

---

### DELETE /zonas/:id
Desactivar zona.

**Headers:** `Authorization: Bearer <token>` (admin)

**Response (200):**
```json
{
  "message": "Zona desactivada"
}
```

---

## Configuraciones

### GET /configuraciones
Listar configuraciones.

**Headers:** `Authorization: Bearer <token>` (admin)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "clave": "fecha_corte_global",
    "valor": { "fecha": "2026-04-30" },
    "descripcion": "Fecha límite global"
  }
]
```

---

### GET /configuraciones/:clave
Obtener configuración por clave.

**Headers:** `Authorization: Bearer <token>` (admin)

**Response (200):**
```json
{
  "clave": "fecha_corte_global",
  "valor": { "fecha": "2026-04-30" }
}
```

---

### PUT /configuraciones/:clave
Actualizar configuración.

**Headers:** `Authorization: Bearer <token>` (admin)

**Request Body:**
```json
{
  "valor": { "fecha": "2026-05-31" }
}
```

**Response (200):**
```json
{
  "clave": "fecha_corte_global",
  "valor": { "fecha": "2026-05-31" },
  "updated_by": "uuid"
}
```

---

## Notificaciones

### GET /notificaciones
Listar notificaciones del usuario.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "destino_id": "uuid",
    "destino_tipo": "usuario",
    "tipo": "recordatorio",
    "titulo": "Recordatorio",
    "cuerpo": "Tienes una visita pendiente",
    "leido": false,
    "enviado_push": false,
    "enviado_email": false,
    "created_at": "2026-04-06T12:00:00Z"
  }
]
```

---

### PATCH /notificaciones/:id
Marcar notificación como leída.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "uuid",
  "leido": true
}
```

---

### DELETE /notificaciones/:id
Eliminar notificación.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Notificación eliminada"
}
```

---

## Dashboard

### GET /dashboard
Obtener estadísticas del dashboard.

**Headers:** `Authorization: Bearer <token>` (admin, coordinador)

**Response (200):**
```json
{
  "total_tecnicos": 10,
  "tecnicos_activos": 8,
  "tecnicos_suspendidos": 2,
  "total_beneficiarios": 150,
  "beneficiarios_activos": 145,
  "bitacoras_mes": 45,
  "bitacoras_pendientes": 5
}
```

---

## Documentos Plantilla

### GET /documentos-plantilla
Listar documentos plantilla.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "nombre": "Formato Visita",
    "descripcion": "Plantilla para formato de visita",
    "obligatorio": true,
    "orden": 1,
    "activo": true
  }
]
```

---

### POST /documentos-plantilla
Crear documento plantilla.

**Headers:** `Authorization: Bearer <token>` (admin)

**Request Body:**
```json
{
  "nombre": "Nueva Plantilla",
  "descripcion": "Descripción",
  "obligatorio": true,
  "orden": 1,
  "configuracion": { "campos": [] }
}
```

---

### PATCH /documentos-plantilla/:id
Actualizar documento plantilla.

**Headers:** `Authorization: Bearer <token>` (admin)

**Request Body:**
```json
{
  "nombre": "Nombre actualizado",
  "obligatorio": false,
  "orden": 2
}
```

---

### DELETE /documentos-plantilla/:id
Desactivar documento plantilla.

**Headers:** `Authorization: Bearer <token>` (admin)

**Response (200):**
```json
{
  "message": "Documento plantilla desactivado"
}
```

---

## Reportes

### GET /reportes/tecnico/:id
Reporte de técnico.

**Headers:** `Authorization: Bearer <token>` (admin, coordinador)

**Query:** `?mes=4&anio=2026`

**Response (200):**
```json
{
  "tecnico": { "id": "uuid", "nombre": "Técnico 1" },
  "bitacoras": 20,
  "beneficiarios": 15,
  "visitas": [
    {
      "id": "uuid",
      "fecha": "2026-04-06",
      "beneficiario": "Beneficiario 1",
      "actividad": "Asesoría"
    }
  ]
}
```

---

## Archive

### GET /archive
Listar archivos.

**Headers:** `Authorization: Bearer <token>` (admin)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "periodo": "2026-03",
    "total_bitacoras": 100,
    "total_fotos": 500,
    "bytes_comprimidos": 104857600,
    "estado": "completado",
    "zip_public_url": "https://...",
    "created_at": "2026-04-01T12:00:00Z"
  }
]
```

---

### POST /archive/:periodo/generar
Generar archivo.

**Headers:** `Authorization: Bearer <token>` (admin)

**Response (200):**
```json
{
  "id": "uuid",
  "periodo": "2026-03",
  "estado": "generando"
}
```

---

### GET /archive/:periodo/descargar
Descargar archivo.

**Headers:** `Authorization: Bearer <token>` (admin)

**Response (200):** Content-Type: application/zip

---

### POST /archive/:periodo/confirmar
Confirmar archivo.

**Headers:** `Authorization: Bearer <token>` (admin)

**Response (200):**
```json
{
  "message": "Archivo confirmado"
}
```

---

### POST /archive/:periodo/forzar
Forzar generación.

**Headers:** `Authorization: Bearer <token>` (admin)

**Response (200):**
```json
{
  "id": "uuid",
  "periodo": "2026-03",
  "estado": "generando"
}
```

**Errores:**
- `409`: Ya existe un archivado en progreso