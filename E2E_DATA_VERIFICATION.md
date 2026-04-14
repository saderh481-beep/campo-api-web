# PLAN DE VERIFICACIÓN E2E: INTEGRIDAD DE DATOS
## Base de Datos → Aplicación Móvil

**Fecha:** 2026-04-14  
**Versión:** 1.0.0  
**Estado:** LISTO PARA EJECUCIÓN ✅  

---

## 1. RESUMEN EJECUTIVO

Este documento establece el plan de verificación de extremo a extremo para garantizar la integridad, consistencia y trazabilidad de los datosfluyendo desde la base de datos PostgreSQL hasta la aplicación móvil (App) a través de la API REST.

### Flujo de Datos Verificado

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ PostgreSQL  │───▶│ API (Hono)  │───▶│ Transport  │───▶│ Mobile App │
│ (origen)   │    │ (backend)   │    │ (HTTP/JSON)│    │ (destino)  │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
     │                   │                   │                   │
  ──┴───────────────   ──┴───────────────   ──┴───────────────   ──┴───────────────
  Validación 1     Validación 2       Validación 3         Validación 4
  Estructura DB    Contratos API      Serialización        Parser App
```

### Áreas de Verificación

| Área | Estado Previsto | Técnicas |
|------|----------------|-----------|
| Integridad estructural | ✅ | Schema validation |
| Consistencia de datos | ✅ | Record count, sampling |
| Integridad referencial | ✅ | FK verification |
| Escenarios de fallo | ✅ | Timeout, retry, error handling |
| Seguridad | ✅ | AuthN/AuthZ, TLS |
| Trazabilidad | ✅ | Logging, audit trail |

---

## 2. ALCANCE

### 2.1 Datos a Verificar

| Recurso | Tabla(s) DB | Endpoint(s) API | Entidad App |
|--------|------------|----------------|-------------|------------|
| Usuarios | usuarios | /usuarios | User |
| Técnicos | usuarios + tecnico_detalles | /tecnicos | Technician |
| Beneficiarios | beneficiarios | /beneficiarios | Beneficiary |
| Bitácoras | bitacoras | /bitacoras | VisitRecord |
| Asignaciones | asignaciones | /asignaciones/* | Assignment |
| Cadenas | cadenas_productivas | /cadenas-productivas | ProductiveChain |
| Actividades | actividades | /actividades | Activity |
| Localidades | localidades | /localidades | Location |
| Zonas | zonas | /zonas | Zone |
| Documentos | documentos | /beneficiarios/:id/documentos | Document |

### 2.2 Componentes Involucrados

| Componente | Tecnología | Versión | Función |
|-----------|-----------|--------|---------|
| Base de datos | PostgreSQL | Externa | Almacenamiento origen |
| API Backend | Hono + Bun | 4.12.11 | Transformación y entrega |
| HTTP | JSON | - | Formato de transporte |
| Mobile App | React Native/Expo | - | Cliente receptor |
| Sesiones | Redis | - | Cache y sesiones |

### 2.3 Supuestos

1. PostgreSQL accesible con usuario reader (sin SELECT en todas las tablas)
2. API expuesta en endpoint conocido (staging o producción)
3. Mobile app tiene versión conocida y puede capturar responses
4. Existe tooling para comparar JSON estructuras (jq, diff)
5. Acceso a logs de la aplicación para trazabilidad

### 2.4 Limitaciones Identificadas

| Limitación | Impacto | Alternativa |
|-----------|--------|------------|
| Sin acceso directo a BD producción | 🔴 Crítico | Solicitar credenciales reader |
| Sin app móvil para testing | 🟡 Medio | Usar emulador o logs |
| Sin endpoint staging | 🟡 Medio | Coordenadarcon DevOps |

### 2.5 Información Requerida

| Dato | Estado | Solicitud |
|------|--------|-----------|
| 🔴 Connection string BD staging | PENDIENTE | Request a DevOps |
| 🔴 Credenciales reader BD | PENDIENTE | Request a DBA |
| 🟡 URL API staging | PENDIENTE | Request a DevOps |
| 🟡 Mobile app build test | PENDIENTE | Request a Mobile Dev |
| 🟢 Colección Postman/cURL | DISPONIBLE | Usar existente |

---

## 3. FLUJO COMPLETO DE DATOS

### 3.1 Diagrama de Flujo

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        FLUJO DE DATOS E2E                                 │
└──────────────────────────────────────────────────────────────────────────────┘

[1] ORIGEN (PostgreSQL)
   │
   ├── Tabla: bitacoras (ejemplo)
   │   ├── id: UUID (PK)
   │   ├── tipo: VARCHAR(80)
   │   ├── tecnico_id: UUID (FK → usuarios)
   │   ├── beneficiario_id: UUID (FK → beneficiarios)
   │   ├── fecha_inicio: TIMESTAMPTZ
   │   ├── actividades_desc: TEXT
   │   ├── foto_rostro_url: TEXT
   │   ├── firma_url: TEXT
   │   └── fotos_campo: TEXT[]
   │
   └── Query: SELECT * FROM bitacoras WHERE id = $1

[2] EXTRACCIÓN (Repository/Model)
   │
   ├── funtion findBitacoraById(id: string): Bitacora
   │   ├── Raw SQL query
   │   ├── Parameterized (no SQLi)
   │   └── JOINs para datos relacionados

[3] TRANSPORTE (API Route)
   │
   ├── Route: GET /bitacoras/:id
   │   ├── Auth middleware
   │   ├── Role validation
   │   └── Response construction
   │
   └── Response JSON:
       {
         "id": "uuid",
         "tipo": "visita",
         "tecnico_nombre": "Juan Pérez",
         "beneficiario_nombre": "Pedro González",
         "actividades_desc": "...",
         "foto_rostro_url": "https://...",
         "firma_url": "https://...",
         "fotos_campo": ["url1", "url2"]
       }

[4] SERIALIZACIÓN (HTTP)
   │
   ├── Content-Type: application/json
   ├── Charset: UTF-8
   ├── Compression: gzip (opcional)
   └── Transfer-Encoding: chunked (si aplica)

[5] RECEPCIÓN (Mobile App)
   │
   ├── HTTP Client (axios/fetch)
   ├── Response parsing
   ├── Type mapping
   └── Local state update
```

### 3.2 Puntos de Validación

| Punto | Validación | Técnica |
|-------|-----------|---------|
| [1] DB | Schema, tipos, constraints | Meta-consultas |
| [2] Query | row count, nulls | COUNT(*), IS NULL |
| [3] Transform | field mapping | diffing |
| [4] Serial | JSON válido | parse + validation |
| [5] Network | headers, encoding | http log |
| [6] Client | type mapping | unit test |

---

## 4. VERIFICACIÓN DE INTEGRIDAD

### 4.1 Integridad Estructural

#### 4.1.1 Esquema de Base de Datos

| Tabla | PK | FK | Indices | Constraints |
|-------|----|-----|--------|------------|
| usuarios | id | - | correo | rol Check |
| tecnico_detalles | id | tecnico_id, coordinador_id | - | Unique |
| beneficiarios | id | tecnico_id, localidad_id | - | - |
| bitacoras | id | tecnico_id, beneficiario_id | fecha_inicio, tecnico_id | - |
| cadenas_productivas | id | - | nombre | - |
| actividades | id | - | nombre | - |
| localidades | id | zona_id | - | - |
| zonas | id | - | nombre | - |
| asignaciones | id | tecnico_id, beneficiario_id | - | Unique compound |

#### 4.1.2 Validación de Esquema

```sql
-- [DB] Validar estructura de tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'bitacoras'
ORDER BY ordinal_position;

-- [DB] Validar Primary Key
SELECT 
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'bitacoras'
    AND tc.constraint_type = 'PRIMARY KEY';

-- [DB] Validar Foreign Keys
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'bitacoras' AND tc.constraint_type = 'FOREIGN KEY';
```

#### 4.1.3 Contratos de API

| Campo BD | Campo API | Tipo BD | Tipo API | Transform |
|----------|----------|--------|---------|----------|
| id | id | UUID | string | - |
| fecha_inicio | fecha_inicio | timestamptz | string ISO8601 | format |
| actividades_desc | actividades_desc | text | string | - |
| foto_rostro_url | foto_rostro_url | text | string url | - |
| fotos_campo | fotos_campo | text[] | string[] | JSON parse |
| created_at | created_at | timestamptz | string | toISOString |

### 4.2 Verificación de Consistencia

#### 4.2.1 Conteo de Registros

```json
// [ESQUEMA DE VERIFICACIÓN]
{
  "verification_id": "uuid",
  "timestamp": "ISO8601",
  "resource": "bitacoras",
  "database": {
    "table": "bitacoras",
    "total_count": 150,
    "filters": "tecnico_id = 'uuid'",
    "query": "SELECT COUNT(*) FROM bitacoras WHERE tecnico_id = $1"
  },
  "api": {
    "endpoint": "/api/v1/bitacoras",
    "method": "GET",
    "params": { "tecnico_id": "uuid" },
    "response_count": 150,
    "status": 200
  },
  "comparison": {
    "match": true,
    "discrepancy": null,
    "difference": 0
  }
}
```

#### 4.2.2 Muestreo Representativo

| Tamaño Población | Tamaño Muestra | Técnica |
|------------------|----------------|----------|
| < 100 | 100% | Census |
| 100-1000 | 100 (10%) | Random stratified |
| > 1000 | 100 | Random |

#### 4.2.3 Comparación de Valores

```json
// [RESULTADO DE COMPARACIÓN]
{
  "sample_id": "uuid",
  "resource_id": "uuid-bitacora-ejemplo",
  "fields_compared": [
    {
      "field": "id",
      "db_value": "550e8400-e29b-41d4-a716-446655440000",
      "api_value": "550e8400-e29b-41d4-a716-446655440000",
      "match": true
    },
    {
      "field": "tipo",
      "db_value": "visita",
      "api_value": "visita",
      "match": true
    },
    {
      "field": "actividades_desc",
      "db_value": "Se realizó asesoría técnica...",
      "api_value": "Se realizó asesoría técnica...",
      "match": true
    },
    {
      "field": "fecha_inicio",
      "db_value": "2026-04-14T10:00:00Z",
      "api_value": "2026-04-14T10:00:00.000Z",
      "match": true,
      "note": "Format ISO same"
    },
    {
      "field": "fotos_campo",
      "db_value": ["{url1}", "{url2}"],
      "api_value": ["{url1}", "{url2}"],
      "match": true
    }
  ],
  "overall_match": true,
  "mismatches": []
}
```

---

## 5. CASOS DE PRUEBA

### 5.1 Casos de Éxito (Happy Path)

| ID | Caso | Condiciones Iniciales | Acción | Entrada | Salida Esperada |
|----|------|---------------------|--------|--------|---------|----------------|
| E2E-01 | Login exitoso | Usuario existe en BD | POST /auth/login | {correo, codigo_acceso} | 200 + token + usuario |
| E2E-02 | Get técnico | Técnico existe | GET /tecnicos/:id | ID válido | 200 + datos completos |
| E2E-03 | List bitácoras | Bitácoras existen | GET /bitacoras | Filtros válidos | 200 + array bitácoras |
| E2E-04 | Get beneficiario con docs | Beneficiario tiene docs | GET /beneficiarios/:id | ID válido | 200 + docs incluídos |
| E2E-05 | Dashboard métricas | Datos existen | GET /dashboard | Token válido | 200 + métricas |

### 5.2 Casos de Fallo y Recuperación

| ID | Caso | Condición Inicial | Acción | Entrada | Salida Esperada |
|----|------|------------------|--------|--------|---------|---------------|
| E2E-06 | Timeout red | Network slow | GET /recurso | - | Timeout + retry |
| E2E-07 | Registro no existe | ID inexistente | GET /recurso/:id | ID inválido | 404 |
| E2E-08 | Sin auth | Sin token | GET /recurso protegido | - | 401 |
| E2E-09 | Auth rota | Token expirado | GET /recurso | Token viejo | 401 + redirect login |
| E2E-10 | Rol insuficiente | Técnico → /usuarios | GET /usuarios | Token técnico | 403 |
| E2E-11 | Datos null | Campo nullable vacío | GET /recurso | ID válido | Campo = null (no error) |
| E2E-12 | Rate limit excedido | >10 requests | POST /auth/login x15 | Credenciales | 429 |
| E2E-13 | BD no disponible | DB fuera | GET /recurso | - | 500 error maneja2do |
| E2E-14 | Archivo muy grande | PDF >10MB | GET /bitacoras/:id/pdf | - | 413 o timeout |
| E2E-15 | Caracteres especiales | TEXT con acentos | GET /bitacoras/:id | - | UTF-8 correcto |

### 5.3 Casos de Consistencia

| ID | Caso | Condición Inicial | Acción | Comparación | Criterio |
|----|------|------------------|--------|-------------|----------|
| E2E-16 | Conteo igual | Registros en BD | GET list + COUNT DB | API count = DB count | Match exacto |
| E2E-17 | Mapeo campos | Registro válido | GET /recurso/:id | fields match | Schema coincidente |
| E2E-18 | Fechas ISO | Date fields | GET /recurso/:id | Format = ISO8601 | Valid date |
| E2E-19 | Arrays no nulos | Text[] no vacío | GET /recurso/:id | Array = parse | Same content |
| E2E-20 | FK referenciada | JOIN requerido | GET /bitacora + join | FK nombre presente | Same ID |

### 5.4 Casos de Seguridad

| ID | Caso | Condición Inicial | Acción | Verificación | Esperado |
|----|------|------------------|--------|--------------|---------|
| E2E-21 | SQL Injection | - | GET /?id=' OR '1'='1 | No SQL exec | Data safe |
| E2E-22 | XSS en campo | Text con script | POST /bitacora + '<script>' | No execute | Escaped |
| E2E-23 | Enumeration rol | - | Cambiar rol header | Enum check | Restricted |
| E2E-24 | Datos sensibles | Token válido | GET /auth/me | No exposición | Masked |

---

## 6. DATOS DE PRUEBA

### 6.1 Esquema de Datos de Prueba

```json
{
  "test_data_version": "1.0.0",
  "created_at": "2026-04-14T08:58:22Z",
  "resources": [
    {
      "resource": "usuarios",
      "records": [
        {
          "id": "admin-user-uuid",
          "correo": "admin@campo.local",
          "nombre": "Admin Principal",
          "rol": "administrador",
          "activo": true
        },
        {
          "id": "coord-user-uuid",
          "correo": "coordinador@campo.local",
          "nombre": "Coordinador Test",
          "rol": "coordinador",
          "activo": true
        },
        {
          "id": "tech-user-uuid",
          "correo": "tecnico1@campo.local",
          "nombre": "Técnico Test",
          "rol": "tecnico",
          "activo": true
        }
      ]
    },
    {
      "resource": "beneficiarios",
      "records": [
        {
          "id": "benef-001",
          "nombre": "Beneficiario Test",
          "municipio": "Test Mun",
          "localidad": "Test Loc",
          "activo": true
        }
      ]
    },
    {
      "resource": "bitacoras",
      "records": [
        {
          "id": "bitacora-001",
          "tipo": "visita",
          "tecnico_id": "tech-user-uuid",
          "beneficiario_id": "benef-001",
          "actividades_desc": "Test de verificación E2E",
          "estado": "borrador"
        }
      ]
    }
  ]
}
```

### 6.2 Datos de Prueba por Recurso

| Recurso | Cantidad | Tipo | Características |
|--------|----------|------|-----------------|
| Usuarios | 3 | Admin, Coord, Técnico | Activos |
| Beneficiarios | 10 | Varios municipios | Con/sin docs |
| Bitácoras | 20 | Diversos estados | Con/sin fotos |
| Asignaciones | 10 | 3 tipos | activas |
| Documentos | 5 | PDF, imágenes | Variados |

---

## 7. FORMATO DE SALIDA

### 7.1 Esquema JSON de Resultados

```json
{
  "verification_output": {
    "version": "1.0.0",
    "timestamp": "2026-04-14T08:58:22Z",
    "environment": "staging",
    "summary": {
      "total_tests": 25,
      "passed": 22,
      "failed": 2,
      "skipped": 1,
      "pass_rate": "88%"
    },
    "results": [
      {
        "test_id": "E2E-01",
        "test_name": "Login exitoso",
        "status": "PASSED",
        "duration_ms": 145,
        "database": {
          "query": "SELECT * FROM usuarios WHERE correo = $1",
          "execution_time_ms": 12,
          "row_count": 1
        },
        "api": {
          "endpoint": "/api/v1/auth/login",
          "status": 200,
          "response_time_ms": 133,
          "response_body": {
            "token": "eyJ...",
            "usuario": { "id": "...", "rol": "admin" }
          }
        },
        "comparison": {
          "match": true,
          "discrepancies": []
        }
      },
      {
        "test_id": "E2E-06",
        "test_name": "Timeout red",
        "status": "PASSED",
        "error_simulation": true,
        "retry_behavior": "Exponential backoff",
        "recovery_time_ms": 2500
      }
    ],
    "discrepancies": [
      {
        "test_id": "E2E-17",
        "test_name": "Mapeo campos",
        "severity": "MEDIUM",
        "description": "Campo 'created_at' tiene formato diferente",
        "db_value": "2026-04-14T10:00:00",
        "api_value": "2026-04-14T10:00:00.000",
        "impact": "Bajo (solo formato)",
        "recommendation": "Normalizar en API layer"
      }
    ]
  }
}
```

### 7.2 CSV de Discrepancias

```csv
test_id,test_name,severity,field,db_value,api_value,discrepancy_type,impact,recommendation
E2E-17,mapeo campos,MEDIO,created_at,2026-04-14T10:00:00,2026-04-14T10:00:00.000,format,Bajo,Normalizar formato
E2E-20,fotos_campo nulo,MEDIO,fotos_campo,["{url}"],["{url}",null],null_in_array,Bajo,Filtrar nulos
```

---

## 8. CRITERIOS DE DIVERGENCIA

### 8.1 Reglas de Decisión

| Condición | Acción | Justificación |
|-----------|--------|---------------|
| API 500 | ❌ FALLO | Error handling deficiente |
| mismatch count > 5% | ❌ FALLO | Consistencia comprometida |
| timeout > 30s | ❌ FALLO | Performance inaceptable |
| datos sensibles expuestos | ❌ FALLO | Security breach |
| mismatch campo único | ⚠️ WARN | Investigar origen |
| mismatch count < 5% | ⚠️ WARN | Aceptable si justificado |
| retry exitoso | ✅ PASÓ | Resiliencia verificada |

### 8.2 Procedimiento de Auditoría

```bash
# [1] Ejecutar verificación
./run_e2e_verification.sh --env staging --output results.json

# [2] Analizar resultados
jq '.verification_output.discrepancies' results.json

# [3] Comparar con baseline
diff -u baseline_results.json results.json > discrepancies.diff

# [4] Generar reporte
./generate_report.py --input results.json --format markdown
```

---

## 9. CRITERIOS DE ÉXITO Y ACEPTACIÓN

### 9.1 Criterios de Éxito

| Criterio | Target | Mínimo Aceptable |
|---------|--------|-----------------|
| Exactitud de datos | 100% | 95% |
| Consistencia de conteos | 100% | 98% |
| Latencia (p50) | < 200ms | < 500ms |
| Latencia (p95) | < 500ms | < 1000ms |
| Success rate (happy path) | 100% | 95% |
| Error handling | 100% | 90% |
| Trazabilidad | 100% | 90% |

### 9.2 Criterios de Aceptación

| Condición | Criterio |
|----------|----------|
| ✅ ACEPTABLE | Todos E2E-01 a E2E-05 pasan |
| ✅ ACEPTABLE | E2E-06 a E2E-15 fallan gracefully |
| ✅ ACEPTABLE | E2E-16 a E2E-20 muestran match >95% |
| ✅ ACEPTABLE | E2E-21 a E2E-24 seguros |
| ⚠️ CONDICIONAL | Discrepancias solo warnings (no failures) |
| ❌ RECHAZABLE | Cualquier failure crítico |
| ❌ RECHAZABLE | Exposición de datos sensibles |

---

## 10. REQUISITOS DE ENTRADA

### 10.1 Accesos y Credenciales

| Recurso | Acceso Requerido | Estado | Notas |
|--------|-----------------|--------|-------|
| 🔴 BD staging (reader) | SELECT en todas las tablas | PENDIENTE | Request a DBA |
| 🟡 BD producción (reader) | Solo lectura | OPCIONAL | Solo si staging no disponible |
| 🟢 API staging | URL + token test | PENDIENTE | Request a DevOps |
| 🟢 API producción | URL pública | DISPONIBLE | Rate limited |
| 🟡 Mobile app test | Build + device/emulator | PENDIENTE | Request a Mobile |

### 10.2 Artefactos Necesarios

| Artefacto | Estado | Ubicación |
|---------|--------|-----------|
| 🔴 Esquema BD completo | PENDIENTE | Request DBA |
| 🟡 Colección Postman | DISPONIBLE | repo/ |
| 🟢 Scripts verification | DISPONIBLE | test-auth-flow.ts |
| 🟡 Baseline results | PENDIENTE | Generar en staging |
| 🟢 Mobile contract | PARCIAL | En API docs |

### 10.3 Información Crítica Faltante

| Dato | ¿Por qué es crítico? | Impacto |
|------|-------------------|---------|
| Connection string BD | No puedo validar origen datos | 🔴 Crítico |
| Credenciales reader | No puedo comparar counts | 🔴 Crítico |
| URL staging | No puedo ejecutar tests automáticos | 🟡 Medio |
| Mobile app | No puedo validar destino | 🟡 Medio |

---

## 11. SEGURIDAD Y CUMPLIMIENTO

### 11.1 Durante la Ejecución

| Medida | Implementación |
|--------|---------------|
| Credenciales | Variables de entorno, no en código |
| Logs | Sanitize PII antes de guardar |
| Red | TLS requerido para BD y API |
| Sesiones | Tokens con TTL limitado |
| Rate limiting | Respetar límites del sistema |

### 11.2 En el Reporte

| Medida | Implementación |
|--------|---------------|
| Datos sensibles | masked en output |
| URLs producción | No incluir en logs |
| Tokens | No registrar en output |
| Errores | Stack trace solo si necesario |

---

## 12. ESTRUCTURA DEL INFORME FINAL

### 12.1 Secciones Recomendadas

1. **Resumen Ejecutivo** (1 página)
   - Estado general
   - Pass/fail summary
   - Recomendación de go/no-go

2. **Alcance** (1 página)
   - Componentes verificados
   - Limitaciones

3. **Supuestos y Limitaciones** (0.5 páginas)
   - Supuestos tomados
   - Información faltante

4. **Entorno** (0.5 páginas)
   - URLs, versiones, configuraciones

5. **Datos de Prueba** (1 página)
   - Fuentes de datos
   - Criterios de selección

6. **Casos de Prueba** (2-3 páginas)
   - Tabla resumen
   - Resultados por categoría

7. **Análisis de Discrepancias** (1-2 páginas)
   - Lista de divergencias
   - Severidad y root cause

8. **Recomendaciones** (1 página)
   - Acciones prioritarias
   - Roadmap

9. **Anexos** (según necesidad)
   - Evidencias
   - Logs
   - Screenshots

---

## 13. PLAN DE EJECUCIÓN

### 13.1 Fases

| Fase | Actividad | Duración | Pre-requisitos |
|------|----------|----------|----------------|
| 1 | Setup entorno | 2h | Credenciales BD + API |
| 2 | Ejecutar tests | 4h | Datos de prueba cargados |
| 3 | Analizar resultados | 2h | Tests completados |
| 4 | Generar informe | 2h | Análisis done |

### 13.2 Estimación Total

| Total | 10 horas |
|-------|----------|

---

## APROBACIÓN

| Rol | Nombre | Fecha | Firma |
|-----|--------|-------|-------|
| Lead QA | | |
| Security | | |
| Product Owner | | |
| DevOps | | |

---

**Documento generado:** 2026-04-14  
**Versión:** 1.0.0  
**Estado:** PENDIENTE DE ACCESOS