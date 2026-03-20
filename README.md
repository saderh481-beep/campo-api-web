# API Web - Documentación de Endpoints

Esta API proporciona endpoints para la aplicación web de administración.

## Autenticación

Todas las rutas (excepto `/auth/*`) requieren autenticación mediante JWT en cookies:
```
Cookie: session=<token>
```

## Endpoints

### Auth (`/auth`)

#### POST `/tecnico`
Envía un código de acceso a un técnico por email.

**Body:**
```json
{
  "email": "string (formato email válido)"
}
```

**Respuesta Exitosa (200):**
```json
{
  "message": "Código enviado exitosamente"
}
```

### Beneficiarios (`/beneficiarios`)

Todas las rutas requieren autenticación y roles de admin o coordinador.

#### GET `/`
Obtiene la lista de beneficiarios.

**Query Parameters:**
- Ninguna (para admin) o filtrado por coordinador (para rol coordinador)

**Respuesta Exitosa (200):**
```json
[
  {
    "id": "uuid",
    "tecnico_id": "uuid",
    "nombre": "string",
    "municipio": "string",
    "localidad": "string (nullable)",
    "direccion": "string (nullable)",
    "cp": "string (nullable)",
    "telefono_principal": "bytea (nullable)",
    "telefono_secundario": "bytea (nullable)",
    "coord_parcela": "point (nullable)",
    "activo": "boolean",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
]
```

#### GET `/:id`
Obtiene un beneficiario específico con sus relaciones.

**Parámetros:**
- `id`: UUID del beneficiario

**Respuesta Exitosa (200):**
```json
{
  "id": "uuid",
  "tecnico_id": "uuid",
  "nombre": "string",
  "municipio": "string",
  "localidad": "string (nullable)",
  "direccion": "string (nullable)",
  "cp": "string (nullable)",
  "telefono_principal": "bytea (nullable)",
  "telefono_secundario": "bytea (nullable)",
  "coord_parcela": "point (nullable)",
  "activo": "boolean",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "cadenas": [
    {
      "id": "uuid",
      "nombre": "string"
    }
  ],
  "documentos": [
    {
      "id": "uuid",
      "tipo": "string",
      "url": "string",
      "nombre_original": "string",
      "r2_key": "string",
      "sha256": "string",
      "bytes": "integer (nullable)",
      "subido_por": "uuid",
      "creado_en": "timestamp"
    }
  ]
}
```

**Errores:**
- 404: Beneficiario no encontrado

#### POST `/`
Crea un nuevo beneficiario.

**Body:**
```json
{
  "nombre": "string (mínimo 2 caracteres)",
  "curp": "string (18 caracteres, opcional)",
  "municipio": "string (opcional)",
  "localidad": "string (opcional)",
  "direccion": "string (opcional)",
  "cp": "string (opcional)",
  "telefono_principal": "string (opcional)",
  "telefono_secundario": "string (opcional)",
  "coord_parcela": "string (opcional)",
  "tecnico_id": "uuid"
}
```

**Respuesta Exitosa (201):**
```json
{
  "id": "uuid",
  "nombre": "string",
  "curp": "string (nullable)",
  "municipio": "string (nullable)",
  "localidad": "string (nullable)",
  "direccion": "string (nullable)",
  "cp": "string (nullable)",
  "telefono_principal": "bytea (nullable)",
  "telefono_secundario": "bytea (nullable)",
  "coord_parcela": "point (nullable)",
  "activo": "boolean",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Errores:**
- 400: Datos inválidos (validación de esquema)
- 409: Ya existe un beneficiario con esa CURP

#### PATCH `/:id`
Actualiza un beneficiario existente.

**Body:**
```json
{
  "nombre": "string (mínimo 2 caracteres, opcional)",
  "curp": "string (18 caracteres, opcional)",
  "municipio": "string (opcional)",
  "localidad": "string (opcional)",
  "direccion": "string (opcional)",
  "cp": "string (opcional)",
  "telefono_principal": "string (opcional)",
  "telefono_secundario": "string (opcional)",
  "coord_parcela": "string (opcional)",
  "tecnico_id": "uuid (opcional)"
}
```

**Respuesta Exitosa (200):**
```json
{
  "id": "uuid",
  "nombre": "string",
  "curp": "string (nullable)",
  "municipio": "string (nullable)",
  "localidad": "string (nullable)",
  "direccion": "string (nullable)",
  "cp": "string (nullable)",
  "telefono_principal": "bytea (nullable)",
  "telefono_secundario": "bytea (nullable)",
  "coord_parcela": "point (nullable)",
  "activo": "boolean",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Errores:**
- 400: Datos inválidos (validación de esquema)
- 404: Beneficiario no encontrado
- 409: Ya existe un beneficiario con esa CURP

#### POST `/:id/cadenas`
Asigna cadenas productivas a un beneficiario (solo admin).

**Body:**
```json
{
  "cadena_ids": "uuid[]"
}
```

**Respuesta Exitosa (200):**
```json
{
  "message": "Cadenas actualizadas"
}
```

#### POST `/:id/documentos`
Sube un documento para un beneficiario.

**Body (FormData):**
- `archivo`: archivo
- `tipo`: string

**Respuesta Exitosa (201):**
```json
{
  "id": "uuid",
  "tipo": "string",
  "url": "string",
  "nombre_archivo": "string",
  "creado_en": "timestamp"
}
```

**Errores:**
- 400: Archivo y tipo son requeridos

#### GET `/:id/documentos`
Obtiene los documentos de un beneficiario.

**Parámetros:**
- `id`: UUID del beneficiario

**Respuesta Exitosa (200):**
```json
[
  {
    "id": "uuid",
    "tipo": "string",
    "url": "string",
    "nombre_archivo": "string",
    "creado_en": "timestamp"
  }
]
```

### Actividades (`/actividades`)

Todas las rutas requieren autenticación y roles de admin o coordinador.

#### GET `/`
Obtiene la lista de actividades.

**Respuesta Exitosa (200):**
```json
[
  {
    "id": "uuid",
    "nombre": "string",
    "descripcion": "string (nullable)",
    "activo": "boolean",
    "created_by": "uuid",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
]
```

#### POST `/`
Crea una nueva actividad.

**Body:**
```json
{
  "nombre": "string (mínimo 2 caracteres)",
  "descripcion": "string (opcional)",
  "created_by": "uuid"
}
```

**Respuesta Exitosa (201):**
```json
{
  "id": "uuid",
  "nombre": "string",
  "descripcion": "string (nullable)",
  "activo": "boolean",
  "created_by": "uuid",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Errores:**
- 400: Datos inválidos (validación de esquema)

#### PATCH `/:id`
Actualiza una actividad existente.

**Body:**
```json
{
  "nombre": "string (mínimo 2 caracteres, opcional)",
  "descripcion": "string (opcional)",
  "created_by": "uuid (opcional)"
}
```

**Respuesta Exitosa (200):**
```json
{
  "id": "uuid",
  "nombre": "string",
  "descripcion": "string (nullable)",
  "activo": "boolean",
  "created_by": "uuid",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Errores:**
- 400: Datos inválidos (validación de esquema)
- 404: Actividad no encontrada

#### DELETE `/:id`
Desactiva una actividad (soft delete).

**Parámetros:**
- `id`: UUID de la actividad

**Respuesta Exitosa (200):**
```json
{
  "message": "Actividad desactivada"
}
```

### Asignaciones (`/asignaciones`)

Todas las rutas requieren autenticación y rol de admin.

#### POST `/beneficiario`
Asigna un técnico a un beneficiario.

**Body:**
```json
{
  "tecnico_id": "uuid",
  "beneficiario_id": "uuid"
}
```

**Respuesta Exitosa (201):**
```json
{
  "id": "uuid",
  "tecnico_id": "uuid",
  "beneficiario_id": "uuid",
  "activo": "boolean",
  "creado_en": "timestamp"
}
```

#### DELETE `/beneficiario/:id`
Elimina la asignación de un técnico a un beneficiario.

**Parámetros:**
- `id`: UUID de la asignación

**Respuesta Exitosa (200):**
```json
{
  "message": "Asignación removida"
}
```

#### POST `/actividad`
Asigna un técnico a una actividad.

**Body:**
```json
{
  "tecnico_id": "uuid",
  "actividad_id": "uuid"
}
```

**Respuesta Exitosa (201):**
```json
{
  "id": "uuid",
  "tecnico_id": "uuid",
  "actividad_id": "uuid",
  "activo": "boolean",
  "creado_en": "timestamp"
}
```

#### DELETE `/actividad/:id`
Elimina la asignación de un técnico a una actividad.

**Parámetros:**
- `id`: UUID de la asignación

**Respuesta Exitosa (200):**
```json
{
  "message": "Asignación de actividad removida"
}
```

### Cadenas (`/cadenas`)

Todas las rutas requieren autenticación y roles de admin o coordinador.

#### GET `/`
Obtiene la lista de cadenas productivas.

**Respuesta Exitosa (200):**
```json
[
  {
    "id": "uuid",
    "nombre": "string",
    "descripcion": "string (nullable)",
    "activo": "boolean",
    "created_by": "uuid",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
]
```

#### POST `/`
Crea una nueva cadena productiva.

**Body:**
```json
{
  "nombre": "string (mínimo 2 caracteres)",
  "descripcion": "string (opcional)"
}
```

**Respuesta Exitosa (201):**
```json
{
  "id": "uuid",
  "nombre": "string",
  "descripcion": "string (nullable)",
  "activo": "boolean",
  "created_by": "uuid",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Errores:**
- 400: Datos inválidos (validación de esquema)

#### PATCH `/:id`
Actualiza una cadena productiva existente.

**Body:**
```json
{
  "nombre": "string (mínimo 2 caracteres, opcional)",
  "descripcion": "string (opcional)"
}
```

**Respuesta Exitosa (200):**
```json
{
  "id": "uuid",
  "nombre": "string",
  "descripcion": "string (nullable)",
  "activo": "boolean",
  "created_by": "uuid",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Errores:**
- 400: Datos inválidos (validación de esquema)
- 404: Cadena no encontrada

#### DELETE `/:id`
Desactiva una cadena productiva (soft delete).

**Parámetros:**
- `id`: UUID de la cadena

**Respuesta Exitosa (200):**
```json
{
  "message": "Cadena desactivada"
}
```

### Técnicos (`/tecnicos`)

Todas las rutas requieren autenticación y roles de admin o coordinador.

#### GET `/`
Obtiene la lista de técnicos.

**Query Parameters:**
- Ninguna (para admin) o filtrado por coordinador (para rol coordinador)

**Respuesta Exitosa (200):**
```json
[
  {
    "id": "uuid",
    "coordinador_id": "uuid",
    "nombre": "string",
    "correo": "string",
    "telefono": "string (nullable)",
    "codigo_acceso": "string (nullable)",
    "fecha_limite": "timestamp (nullable)",
    "activo": "boolean",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "coordinador_nombre": "string (nullable)"
  }
]
```

#### GET `/:id`
Obtiene un técnico específico con sus asignaciones.

**Parámetros:**
- `id`: UUID del técnico

**Respuesta Exitosa (200):**
```json
{
  "id": "uuid",
  "coordinador_id": "uuid",
  "nombre": "string",
  "correo": "string",
  "telefono": "string (nullable)",
  "codigo_acceso": "string (nullable)",
  "fecha_limite": "timestamp (nullable)",
  "activo": "boolean",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "asignaciones": [
    {
      "id": "uuid",
      "beneficiario": "string",
      "activo": "boolean"
    }
  ]
}
```

**Errores:**
- 404: Técnico no encontrado
- 403: Sin permisos (si el coordinador intenta acceder a un técnico de otro coordinador)

#### POST `/`
Crea un nuevo técnico.

**Body:**
```json
{
  "nombre": "string (mínimo 2 caracteres)",
  "correo": "string (formato email válido)",
  "telefono": "string (opcional)",
  "coordinador_id": "uuid",
  "fecha_limite": "datetime (opcional)"
}
```

**Respuesta Exitosa (201):**
```json
{
  "id": "uuid",
  "nombre": "string",
  "correo": "string",
  "telefono": "string (nullable)",
  "fecha_limite": "timestamp (nullable)",
  "activo": "boolean",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Errores:**
- 400: Datos inválidos (validación de esquema)

#### PATCH `/:id`
Actualiza un técnico existente.

**Body:**
```json
{
  "nombre": "string (mínimo 2 caracteres, opcional)",
  "correo": "string (formato email válido, opcional)",
  "telefono": "string (opcional)",
  "coordinador_id": "uuid (opcional)",
  "fecha_limite": "datetime (opcional)"
}
```

**Respuesta Exitosa (200):**
```json
{
  "id": "uuid",
  "nombre": "string",
  "correo": "string",
  "telefono": "string (nullable)",
  "fecha_limite": "timestamp (nullable)",
  "activo": "boolean",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Errores:**
- 400: Datos inválidos (validación de esquema)
- 404: Técnico no encontrado

#### POST `/:id/codigo`
Genera y envía un código de acceso para un técnico.

**Respuesta Exitosa (200):**
```json
{
  "message": "Código generado y enviado",
  "codigo": "string (5 caracteres)"
}
```

#### DELETE `/:id`
Desactiva un técnico (soft delete).

**Parámetros:**
- `id`: UUID del técnico

**Respuesta Exitosa (200):**
```json
{
  "message": "Técnico desactivado"
}
```

### Notificaciones (`/notificaciones`)

Todas las rutas requieren autenticación.

#### GET `/`
Obtiene las notificaciones no leídas del usuario.

**Respuesta Exitosa (200):**
```json
[
  {
    "id": "uuid",
    "destino_id": "uuid",
    "destino_tipo": "string",
    "tipo": "string",
    "titulo": "string",
    "cuerpo": "string",
    "leido": "boolean",
    "enviado_push": "boolean",
    "enviado_email": "boolean",
    "creado_en": "timestamp"
  }
]
```

#### PATCH `/:id/leer`
Marca una notificación como leída.

**Parámetros:**
- `id`: UUID de la notificación

**Respuesta Exitosa (200):**
```json
{
  "message": "Marcada como leída"
}
```

### Reportes (`/reportes`)

Todas las rutas requieren autenticación.

#### GET `/bitacoras-mensual`
Obtiene un reporte mensual de bitácoras.

**Respuesta Exitosa (200):**
```json
{
  "mes": "integer",
  "año": "integer",
  "total_bitacoras": "integer",
  "bitacoras_por_estado": {
    "borrador": "integer",
    "cerrada": "integer",
    "cancelada": "integer"
  },
  "bitacoras_por_tipo": {
    "beneficiario": "integer",
    "actividad": "integer"
  }
}
```

### Usuarios (`/usuarios`)

Todas las rutas requieren autenticación.

#### GET `/perfil`
Obtiene el perfil del usuario autenticado.

**Respuesta Exitosa (200):**
```json
{
  "id": "uuid",
  "correo": "string",
  "nombre": "string",
  "rol": "string (admin|coordinador)",
  "activo": "boolean",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### PATCH `/perfil`
Actualiza el perfil del usuario autenticado.

**Body:**
```json
{
  "nombre": "string (mínimo 2 caracteres, opcional)",
  "correo": "string (formato email válido, opcional)"
}
```

**Respuesta Exitosa (200):**
```json
{
  "id": "uuid",
  "correo": "string",
  "nombre": "string",
  "rol": "string (admin|coordinador)",
  "activo": "boolean",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Errores:**
- 400: Datos inválidos (validación de esquema)