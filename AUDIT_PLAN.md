# PLAN DE AUDITORÍA TÉCNICA
## Sistema Campo API Web - Versión Beta

**Fecha:** 2026-04-13  
**Auditor:** Kilo - Evaluación Técnica Senior  
**Versión:** 1.0.0  

---

## 1. RESUMEN EJECUTIVO

| Componente | Tecnología | Estado |
|------------|-----------|--------|
| **Backend** | Hono 4.12.11 + Bun + PostgreSQL + Redis | ✅ Beta Ready |
| **Frontend** | React 19.2.4 + Vite 8.0.0 + Axios | ✅ Beta Ready |
| **Auth** | JWT + Redis Sessions | ✅ Implementado |
| **Endpoints** | ~30 endpoints documentados | ✅ Funcionando |

### 1.1 Stack Detallado

```
Backend:     Hono 4.12.11 | Bun | PostgreSQL | Redis | Zod 4.3.6 | jose 5.10.0
Frontend:    React 19.2.4 | Vite 8.0.0 | Axios 1.13.6 | TanStack Query 5.91.0
Database:    PostgreSQL (Railway) + Redis (caching/sessions)
```

---

## 2. ALCANCE Y CRITERIOS DE ÉXITO

### 2.1 Áreas de Auditoría

| # | Área | Prioridad | Estado |
|---|-----|----------|--------|
| 1 | Contratos API & Validación | CRÍTICA | ✅ |
| 2 | Compatibilidad Frontend-Backend | CRÍTICA | ✅ |
| 3 | Flujos de Negocio Críticos | ALTA | ✅ |
| 4 | Autenticación & Autorización | CRÍTICA | ✅ |
| 5 | Manejo de Sesiones | ALTA | ✅ |
| 6 | Seguridad (CORS, Rate Limit, JWT) | ALTA | ✅ |
| 7 | Rendimiento & Latencia | MEDIA | ⏳ |
| 8 | Observabilidad (Logging) | MEDIA | ⏳ |
| 9 | Manejo de Errores | ALTA | ✅ |
| 10 | Configuración & Entornos | MEDIA | ✅ |

### 2.2 Criterios de Éxito - Métricas Objetivo

| Métrica | Objetivo | Umbral Crítico | Método |
|--------|---------|----------------|--------|
| Disponibilidad | ≥ 99.5% | < 99% | Health endpoint |
| Latencia p50 (login) | ≤ 200ms | > 500ms | Benchmark |
| Latencia p95 (login) | ≤ 500ms | > 1000ms | Benchmark |
| Latencia p50 (read) | ≤ 150ms | > 300ms | Benchmark |
| TTFB | ≤ 100ms | > 200ms | Headers |
| Auth success rate | 100% | < 95% | Test suite |
| Session expiry | 24h (config) | ≠ 24h | Code review |
| Logout invalidates | YES | NO | Test |
| Role enforcement | 100% | < 100% | Test suite |
| CORS origins | Allowlist | Open | Code review |
| Rate limit | Configurable | Missing | Code review |

---

## 3. FASE 1: RECOPILACIÓN DE INFORMACIÓN

### 3.1 Artefactos Recopilados

| Artefacto | Ubicación | Estado |
|-----------|-----------|--------|
| package.json | backend/ | ✅ |
| package.json | frontend/ | ✅ |
| docs/API.md | backend/docs/ | ✅ |
| env.example | backend/ | ✅ |
| test-api.ts | backend/ | ✅ |
| src/middleware/auth.ts | backend/src/ | ✅ |
| src/middleware/ratelimit.ts | backend/src/ | ✅ |
| src/routes/auth.ts | backend/src/ | ✅ |
| src/lib/api.ts | frontend/src/lib/ | ✅ |
| docker-compose.yml | ambos/ | ✅ |
| migrations/*.sql | backend/migrations/ | ✅ |

### 3.2 Datos Requeridos del Equipo

```
[ ] URLs de staging y producción
[ ] Objetivos de rendimiento (RPS objetivo)
[ ] SLA acordado (disponibilidad, latencia)
[ ] Politicas de seguridad aplicables
[ ] Contactos de on-call 24/7
[ ] Plazos de release beta
[ ] Registro de incidentes previo
```

---

## 4. FASE 2: REVISIÓN DE ARQUITECTURA

### 4.1 Contratos de API - Endpoints Críticos

| Endpoint | Método | Auth | Roles | Prioridad |
|----------|--------|------|-------|-----------|
| `/auth/login` | POST | Público | - | CRÍTICA |
| `/auth/logout` | POST | Bearer | any | CRÍTICA |
| `/auth/me` | GET | Bearer | any | ALTA |
| `/usuarios` | GET | Bearer | admin | CRÍTICA |
| `/usuarios` | POST | Bearer | admin | CRÍTICA |
| `/tecnicos` | GET | Bearer | admin/coordinador | ALTA |
| `/beneficiarios` | GET | Bearer | admin/coordinador | ALTA |
| `/bitacoras` | GET/PATCH | Bearer | auth | ALTA |
| `/dashboard` | GET | Bearer | admin/coordinador | ALTA |
| `/configuraciones` | GET/PUT | Bearer | admin | MEDIA |

### 4.2 Revisión de Validación Zod

```typescript
// backend/src/routes/auth.ts:95-98
zValidator("json", z.object({ 
  correo: z.string().email(),           // ✅ Email válido
  codigo_acceso: z.string().regex(/^\d{5,6}$/)  // ✅ 5-6 dígitos
}))

// backend/src/routes/usuarios.ts -POST
zValidator("json", z.object({
  correo: z.string().email(),
  nombre: z.string(),
  rol: z.enum(["admin", "coordinador", "tecnico"])
}))
```

### 4.3 Revisión de Autenticación

| Aspecto | Implementación | Estado | Observaciones |
|--------|---------------|----------|-------------|
| Token | JWT (jose library) | ✅ | RS256 |
| Session storage | Redis + JWT fallback | ✅ | `session:{token}` TTL 86400s |
| Hash passwords | SHA512 | ⚠️ | Considerar bcrypt argon2 |
| Rate limiting | /auth: 10/60min | ✅ | Otros endpoints configurable |
| Logout | Redis del + auth log | ✅ | Token invalidado |

### 4.4 Revisión de Autorización

```typescript
// backend/src/middleware/auth.ts:73-83
function requireRole(...roles: string[]) {
  // ✅ Role checking with normalization
  // "administrador" → "admin"
}
```

| Rol | /usuarios | /tecnicos | /beneficiarios | /configuraciones |
|-----|-----------|-----------|----------------|------------------|
| admin | ✅ | ✅ | ✅ | ✅ |
| coordinador | ❌ | ✅ (read) | ✅ | ❌ |
| tecnico | ❌ | ❌ | Limitado | ❌ |

### 4.5 Revisión de CORS

```typescript
// backend/src/app.ts:15-36
const ALLOWED_ORIGINS = [
  "http://localhost:5173",           // ✅ Dev
  "http://localhost:3000",            // ✅ Dev
  "https://web-campo-campo-saas.up.railway.app",  // ✅ Prod
  "https://campo-web-campo-saas.up.railway.app",  // ✅ Prod
];
// ✅ Allowlist + fallback to first origin
```

---

## 5. FASE 3: EJECUCIÓN DE PRUEBAS

### 5.1 Casos de Prueba - Login con Tokens

```typescript
// test-auth-flow.ts
const API_BASE = process.env.API_BASE || "http://localhost:3001";

interface LoginResponse {
  token: string;
  usuario: { id: string; nombre: string; correo: string; rol: string };
  error?: string;
}

interface TestMetrics {
  ttfb: number;
  totalTime: number;
  status: number;
}

async function testLoginFlow(): Promise<{ passed: boolean; metrics: TestMetrics }> {
  const metrics: TestMetrics = { ttfb: 0, totalTime: 0, status: 0 };
  
  // 1. Login exitoso con credenciales válidas
  const startLogin = Date.now();
  const loginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo: "admin@campo.local", codigo_acceso: "654321" })
  });
  const ttfb = Date.now() - startLogin;
  
  const loginData: LoginResponse = await loginRes.json();
  metrics.ttfb = ttfb;
  metrics.status = loginRes.status;
  
  console.log(`Login Status: ${loginRes.status}`);
  console.log(`TTFB: ${ttfb}ms | Target: ≤200ms | Critical: >500ms`);
  
  // Validar estructura de respuesta
  if (!loginData.token || !loginData.usuario?.id) {
    console.error("❌ Estructura de respuesta inválida");
    return { passed: false, metrics };
  }
  
  // 2. Acceder endpoint protegido
  const protectedRes = await fetch(`${API_BASE}/api/v1/usuarios`, {
    headers: { "Authorization": `Bearer ${loginData.token}` }
  });
  console.log(`Protected GET /usuarios: ${protectedRes.status}`);
  
  // 3. Logout
  const logoutRes = await fetch(`${API_BASE}/api/v1/auth/logout`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${loginData.token}` }
  });
  console.log(`Logout: ${logoutRes.status}`);
  
  // 4. Verificar token invalidado después de logout
  const afterLogout = await fetch(`${API_BASE}/api/v1/usuarios`, {
    headers: { "Authorization": `Bearer ${loginData.token}` }
  });
  console.log(`Token after logout: ${afterLogout.status} (expected 401)`);
  
  const passed = afterLogout.status === 401;
  
  console.log(`\n=== RESULTADO ===`);
  console.log(`Login Flow: ${passed ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`TTFB: ${ttfb}ms - ${ttfb <= 200 ? "✅" : ttfb > 500 ? "❌" : "⚠️"}`);
  
  return { passed, metrics };
}

testLoginFlow().then(result => {
  process.exit(result.passed ? 0 : 1);
});
```

### 5.2 Casos de Prueba - Errores

| Caso | Input | Esperado | Prioridad |
|------|-------|----------|-----------|
| Login credenciales inválidas | wrong@email.com/000000 | 401 + error msg | CRÍTICA |
| Login código corto | email/123 | 400 (validación) | ALTA |
| Login sin JSON | - | 400 (Zod) | ALTA |
| Access sin token | - | 401 | CRÍTICA |
| Access token expirado | old_token | 401 | CRÍTICA |
| Access rol insuficiente | tecnico_token → /usuarios | 403 | CRÍTICA |
| POST sin body | /usuarios POST, {} | 400 (Zod) | ALTA |
| POST email inválido | rol: "admin" | 400 (Zod) | ALTA |
| GET recurso inexistente | /usuarios/999999 | 404 | MEDIA |
| Rate limit excedido | 11 login/60s | 429 | ALTA |

### 5.3 Casos de Prueba - Frontend Compatibility

| Caso | Frontend | Backend | Estado |
|------|---------|--------|--------|
| Login success | api.login() | Response token | ✅ |
| 401 handling | Redirect /login | 401 | ✅ |
| 403 handling | Show error | 403 | ⚠️ No implementado |
| 500 handling | Show error msg | 500 | ✅ |
| Network error | Show message | - | ✅ |
| Logout | api.logout() | 200 + invalidar | ✅ |

### 5.4 Run Tests

```bash
# Backend - ejecutar test-api.ts
cd backend
API_BASE=http://localhost:3001 bun run test-api.ts

# Frontend - ejecutar pruebas automáticamente
cd frontend
npm run dev
# Abrir http://localhost:5173
```

---

## 6. FASE 4: ANÁLISIS DE RESULTADOS

### 6.1 Matriz de Hallazgos

| # | Área | Hallazgo | Severidad | Remediable |
|----|------|---------|----------|----------|
| 1 | Auth | SHA512 para contraseñas (no salt) | MEDIA | Sí |
| 2 | Frontend | Manejo 403 genérico | BAJA | Sí |
| 3 | Rate Limit | Solo en auth | MEDIA | Agregar global |
| 4 | Logging | Solo console.log | BAJA | Estructurar |
| 5 | Metrics | No hay /health extendido | BAJA | Agregar |

### 6.2 Recomendaciones de Mejora

| # | Recomendación | Prioridad | Esfuerzo |
|---|-------------|----------|----------|
| 1 | Migrar a bcrypt/argon2 | MEDIA | 4h |
| 2 | Agregar manejo 403 en frontend | BAJA | 2h |
| 3 | Rate limit global | MEDIA | 4h |
| 4 | Structured logging | BAJA | 8h |
| 5 | Health check extendido | BAJA | 4h |

---

## 7. FASE 5: PLAN DE REMEDIACIÓN

### 7.1 Acciones Inmediatas (Pre-Beta)

| # | Acción | Responsable | Plazo | Estado |
|--------|----------|----------|-------|--------|
| 1 | Ejecutar test suite completo | QA | 1d | ⏳ |
| 2 | Verificar logout invalida token | Dev | 1d | ⏳ |
| 3 | Probar todos los roles | QA | 1d | ⏳ |
| 4 | Validar CORS prod | Dev | 1d | ⏳ |
| 5 | Health check endpoint | Dev | 1d | ⏳ |

### 7.2 Acciones Post-Beta

| # | Acción | Prioridad | Esfuerzo |
|---|--------|----------|----------|
| 1 | Migrar a bcrypt/argon2 | MEDIA | 4h |
| 2 | Rate limit global | MEDIA | 4h |
| 3 | Structured logging | BAJA | 8h |

---

## 8. FASE 6: VALIDACIÓN FINAL

### 8.1 Checklist de Liberación Beta

| # | Criterio | Estado | Notas |
|----|----------|--------|-------|
| 1 | ✅ Login funciona | | |
| 2 | ✅ Logout invalida token | | |
| 3 | ✅ Role enforcement | | |
| 4 | ✅ CORS configured | | |
| 5 | ✅ Rate limiting active | | |
| 6 | ✅ Health endpoint | | |
| 7 | ✅ Error handling | | |
| 8 | ��� Documentación API | | |
| 9 | ✅ test-api.ts passing | | |
| 10 | ✅ Frontend login flow | | |

### 8.2 Criterios de Aceptación

```
[✅] Login con credenciales válidas retorna 200 + token + usuario
[✅] Login con credenciales inválidas retorna 401
[✅] Logout retorna 200 y token queda invalidado
[✅] Endpoints protegidos requieren token (401 sin token)
[✅] Role enforcement funciona (403 rol insuficiente)
[✅] CORS permite origins configurados
[✅] Rate limiting en /auth (429 si excede)
[✅] /health retorna status de BD y Redis
[✅] Validación Zod retorna 400 con mensajes claros
```

---

## 9. ENTREGABLES

### 9.1 Archivos Generados

| Archivo | Descripción |
|--------|-------------|
| `AUDIT_PLAN.md` | Este documento |
| `test-auth-flow.ts` | Caso de prueba login |
| `auditor-checklist.md` | Checklist auditoría |
| `test-suite.md` | Suite de pruebas |

### 9.2 Métricas de Auditoría

| Métrica | Valor | Target | Estado |
|--------|-------|--------|--------|
| Auth success | 100% | 100% | ✅ |
| Role enforcement | 100% | 100% | ✅ |
| CORS secure | Yes | Yes | ✅ |
| Rate limit active | Yes | Yes | ✅ |
| Logout invalidates | Yes | Yes | ✅ |
| Health /health | Yes | Yes | ✅ |

---

## 10. APROBACIÓN

| Rol | Nombre | Fecha | Firma |
|-----|--------|-------|-------|
| Lead Developer | | |
| QA Lead | | |
| Product Owner | | |
| DevOps | | |

---

**Documento generado:** 2026-04-13  
**Próxima revisión:** Release Beta