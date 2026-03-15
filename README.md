# campo-api-web

API REST para el panel web de Admin y Coordinador — SaaS Campo · Secretaría de Agricultura Hidalgo.

## Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Base de datos**: PostgreSQL 16 (Railway)
- **Caché / sesiones**: Redis (Railway)
- **Correo**: Resend
- **Archivos**: Cloudflare R2

## Estructura

```
src/
├── config/
│   ├── env.ts          # Variables de entorno validadas con Zod
│   └── db.ts           # Clientes PostgreSQL + Redis
├── types/
│   └── index.ts        # Tipos de dominio compartidos
├── lib/
│   ├── errors.ts       # AppError, NotFoundError, handleError
│   ├── jwt.ts          # signToken, verifyToken
│   └── pagination.ts   # paginate(), paginationOffset()
├── middleware/
│   └── auth.ts         # requireAuth, requireAdmin, requireCoordinador
├── modules/
│   ├── auth/           # OTP correo · JWT 8h · cookie HttpOnly
│   ├── usuarios/       # CRUD Admin/Coordinador
│   ├── tecnicos/       # CRUD + código 5d + Redis TTL
│   ├── cadenas/        # CRUD cadenas productivas
│   ├── actividades/    # CRUD actividades Tipo B
│   ├── beneficiarios/  # CRUD + N:M cadenas + búsqueda fonética
│   ├── bitacoras/      # Consulta + edición + stream PDF
│   ├── reportes/       # Reporte mensual por técnico
│   └── notificaciones/ # Bandeja de entrada + marcar leída
└── index.ts            # Entry point · registro de rutas
```

Cada módulo sigue la convención:
```
modulo/
├── schema.ts      # Validación Zod de entradas
├── repository.ts  # Queries SQL (sin lógica de negocio)
├── service.ts     # Lógica de negocio (cuando aplica)
└── router.ts      # Rutas Hono · llama a service o repository
```

## Endpoints

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/auth/otp` | — | Solicitar código OTP por correo |
| POST | `/auth/login` | — | Verificar OTP → JWT cookie |
| POST | `/auth/logout` | Auth | Cerrar sesión |
| GET | `/auth/me` | Auth | Datos del usuario autenticado |
| GET | `/usuarios` | Admin | Listar usuarios |
| POST | `/usuarios` | Admin | Crear usuario |
| PATCH | `/usuarios/:id` | Admin | Actualizar usuario |
| DELETE | `/usuarios/:id` | Admin | Desactivar usuario |
| GET | `/tecnicos` | Admin/Coord | Listar técnicos |
| POST | `/tecnicos` | Admin | Crear técnico + código Redis |
| PATCH | `/tecnicos/:id` | Admin | Actualizar técnico |
| POST | `/tecnicos/:id/regenerar-codigo` | Admin | Nuevo código → invalida anterior |
| DELETE | `/tecnicos/:id` | Admin | Desactivar + revocar código Redis |
| GET | `/cadenas-productivas` | Admin/Coord | Listar cadenas |
| POST | `/cadenas-productivas` | Admin | Crear cadena |
| PATCH | `/cadenas-productivas/:id` | Admin | Actualizar cadena |
| GET | `/actividades` | Admin/Coord | Listar actividades |
| POST | `/actividades` | Admin | Crear actividad |
| PATCH | `/actividades/:id` | Admin | Actualizar actividad |
| GET | `/beneficiarios` | Admin/Coord | Listar con paginación y búsqueda |
| POST | `/beneficiarios` | Admin/Coord | Crear + asignar cadenas |
| PATCH | `/beneficiarios/:id` | Admin/Coord | Actualizar |
| GET | `/bitacoras` | Admin/Coord | Listar con filtros |
| GET | `/bitacoras/:id` | Admin/Coord | Detalle + versiones PDF |
| PATCH | `/bitacoras/:id` | Admin/Coord | Editar notas (solo borrador) |
| GET | `/bitacoras/:id/pdf` | Admin/Coord | Stream PDF más reciente |
| GET | `/bitacoras/:id/pdf/descargar` | Admin/Coord | Descarga forzada PDF |
| GET | `/reportes/mensual` | Admin/Coord | Reporte mensual por técnico |
| GET | `/notificaciones` | Auth | Listar notificaciones |
| PATCH | `/notificaciones/:id/leer` | Auth | Marcar como leída |
| PATCH | `/notificaciones/leer-todas` | Auth | Marcar todas leídas |

## Desarrollo local

```bash
# 1. Instalar dependencias
bun install

# 2. Copiar variables de entorno
cp .env.example .env
# Rellenar DATABASE_URL, REDIS_URL, JWT_SECRET, RESEND_API_KEY, EMAIL_FROM

# 3. Arrancar
bun run dev

# Verificar
curl http://localhost:3001/health
```

## Despliegue en Railway

1. Crear repo en GitHub y hacer push
2. Railway → **New Project → Deploy from GitHub repo**
3. Agregar las variables de entorno del `.env.example`
4. Railway detecta `railway.toml` automáticamente
5. Verificar: `https://<nombre>.railway.app/health`

## Seguridad

- JWT en **cookie HttpOnly** — inaccesible desde JS del navegador
- OTP guardado como **bcrypt hash** en Redis — nunca en texto plano
- Bloqueo automático tras **3 intentos fallidos** (30 min)
- RBAC estricto — coordinador nunca accede a datos de otros coordinadores
- Rate limiting por IP en todos los endpoints
