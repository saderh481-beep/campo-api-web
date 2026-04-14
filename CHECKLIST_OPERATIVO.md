# CHECKLIST OPERATIVO: STAGING / PRODUCCIÓN
## Sistema Campo API Web - Beta

**Fecha:** 2026-04-14  
**Versión:** 1.0.0  

---

## 1. VERIFICACIONES PRE-DESPLIEGUE

### 1.1 Código y Build

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 1.1.1 | ✅ typecheck pasando | | |
| 1.1.2 | ✅ Build sin errores | | |
| 1.1.3 | ✅ Tests unitarios pasando | | |
| 1.1.4 | ✅ Rama correcta (main/production) | | |
| 1.1.5 | ✅ Commit hash documentado | | |

### 1.2 Variables de Entorno

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 1.2.1 | ✅ DATABASE_URL configurado | | |
| 1.2.2 | ✅ DATABASE_DIRECT_URL configurado | | |
| 1.2.3 | ✅ REDIS_URL configurado | | |
| 1.2.4 | ✅ JWT_SECRET configurado (64+ chars) | | |
| 1.2.5 | ✅ PORT configurado (3001) | | |
| 1.2.6 | ✅ WEB_ORIGIN production configurado | | |
| 1.2.7 | ✅ NODE_ENV=production | | |
| 1.2.8 | ☐ FILES_API_URL producción | | |
| 1.2.9 | ☐ FILES_API_KEY producción | | |

### 1.3 Seguridad

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 1.3.1 | ✅ JWT_SECRET rotated | | |
| 1.3.2 | ✅ CORS production origins únicas | | |
| 1.3.3 | ✅ Rate limiting activo | | |
| 1.3.4 | ✅ secureHeaders activo | | |
| 1.3.5 | ✅ Health sin exponer info敏感 | | |
| 1.3.6 | ☐ Dependencias sin vulnerabilidades | | |

---

## 2. BASE DE DATOS

### 2.1 Migraciones

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 2.1.1 | ✅ Todas las migraciones aplicadas | | |
| 2.1.2 | ☐ Verificar migración001 | | |
| 2.1.3 | ☐ Verificar migración010 | | |
| 2.1.4 | ✅ FK constraints activas | | |
| 2.1.5 | ✅ Índices creados | | |

### 2.2 Integridad

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 2.2.1 | ☐ Foreign keys intactas | | |
| 2.2.2 | ☐ Sin orphan records | | |
| 2.2.3 | ☐ Tables con datos mínimos | | |
| 2.2.4 | ☐ View count normal | | |

### 2.3 Pool y Conexiones

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 2.3.1 | ✅ Pool no exceeded (10) | | |
| 2.3.2 | ☐ Conexiones idle<20s | | |

---

## 3. REDIS

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 3.1 | ✅ Redis conecta | | |
| 3.2 | ✅ PING responsive | | |
| 3.3 | ☐ Memory acceptable | | |

---

## 4. SEEDS Y DATOS INICIALES

### 4.1 Usuarios

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 4.1.1 | ☐ Admin user existe | | |
| 4.1.2 | ☐ Coordenador user existe | | |
| 4.1.3 | ☐ Técnico user existe | | |
| 4.1.4 | ☐ Contraseñas con hash correcto | | |

### 4.2 Catálogos

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 4.2.1 | ☐ Cadenas productivas | | |
| 4.2.2 | ☐ Actividades | | |
| 4.2.3 | ☐ Zonas | | |
| 4.2.4 | ☐ Localidades | | |

### 4.3 Configuraciones

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 4.3.1 | ☐ fecha_corte_global | | |
| 4.3.2 | ☐ Configuración PDF | | |

---

## 5. CONFIGURACIÓN DE APPLICATION

### 5.1 Features y Flags

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 5.1.1 | ☐ Feature flags inicializados | | |
| 5.1.2 | ☐ new_auth = false | | |
| 5.1.3 | ☐ beta_features = false | | |

### 5.2 Timeouts

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 5.2.1 | ☐ Connection timeout = 10s | | |
| 5.2.2 | ☐ Idle timeout = 20s | | |

### 5.3 Logs

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 5.3.1 | ☐ LOG_LEVEL=info/warn/error | | |
| 5.3.2 | ☐ JSON structured en production | | |

---

## 6. DESPLIEGUE

### 6.1 Build

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 6.1.1 | ☐ Docker build exitoso | | |
| 6.1.2 | ☐ Imagen < 100MB | | |
| 6.1.3 | ☐ Sinlayer de security | | |

### 6.2 Deploy

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 6.2.1 | ☐ servicio iniciado | | |
| 6.2.2 | ☐ Puerto listening (3001) | | |
| 6.2.3 | ☐ Health check passing | | |
| 6.2.4 | ☐ Replicas healthy | | |

### 6.3 Canary/Blue-Green

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 6.3.1 | ☐ Traffic routing | | |
| 6.3.2 | ☐ Canary 5% (si aplica) | | |
| 6.3.3 | ☐ Rollback procedure ready | | |

---

## 7. POST-DESPLIEGUE

### 7.1 Health

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 7.1.1 | ☐ GET /health returns 200 | | |
| 7.1.2 | ☐ GET /api/v1/health returns 200 | | |
| 7.1.3 | ☐ Database status = ok | | |
| 7.1.4 | ☐ Redis status = ok | | |

### 7.2Autenticación

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 7.2.1 | ☐ POST /auth/login 200 | | |
| 7.2.2 | ☐ Token received | | |
| 7.2.3 | ☐ GET /auth/me with token 200 | | |
| 7.2.4 | ☐ POST /auth/logout 200 | | |
| 7.2.5 | ☐ Token invalidado post-logout | | |

### 7.3 Endpoints

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 7.3.1 | ☐ GET /usuarios (admin) | | |
| 7.3.2 | ☐ GET /tecnicos | | |
| 7.3.3 | ☐ GET /beneficiarios | | |
| 7.3.4 | ☐ GET /bitacoras | | |
| 7.3.5 | ☐ GET /dashboard | | |
| 7.3.6 | ☐ GET /configuraciones | | |

### 7.4 PDF y Archivos

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 7.4.1 | ☐ GET /bitacoras/:id/pdf 200 | | |
| 7.4.2 | ☐ PDF es válido | | |
| 7.4.3 | ☐ POST /bitacoras/:id/foto-rostro | | |

### 7.5 Rate Limiting

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 7.5.1 | ☐ 11x /auth/login = 429 | | |

### 7.6 CORS

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 7.6.1 | ☐ Origin production allowed | | |
| 7.6.2 | ☐ Origin no-allowed rejected | | |

---

## 8. MONITOREO

### 8.1 Métricas

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 8.1.1 | ☐ Dashboard accesible | | |
| 8.1.2 | ☐ Métricas fluyendo | | |
| 8.1.3 | ☐ Logs accesibles | | |

### 8.2 Alertas

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 8.2.1 | ☐ Alerta crash configurada | | |
| 8.2.2 | ☐ Alerta high latency | | |
| 8.2.3 | ☐ Alerta high error rate | | |

---

## 9. DOCUMENTACIÓN

| # | Verificación | Estado | Notas |
|----|-------------|--------|-------|
| 9.1 | ☐ URL API documentada | | |
| 9.2 | ☐ Credentials compartidas | | |
| 9.3 | ☐ Contactos on-call | | |
| 9.4 | ☐ Runbook disponible | | |

---

## 10. CHECKLIST FINAL

### Resumen de Verificaciones

| Sección | Total | ✅ | ⏳ | ❌ |
|---------|-------|-----|-----|-----|
| Pre-despliegue | 19 | - | - | - |
| Base de datos | 8 | - | - | - |
| Redis | 3 | - | - | - |
| Seeds | 9 | - | - | - |
| Config | 6 | - | - | - |
| Despliegue | 9 | - | - | - |
| Post-despliegue | 26 | - | - | - |
| Monitoreo | 6 | - | - | - |
| Documentación | 4 | - | - | - |
| **TOTAL** | **90** | **-** | **-** | **-** |

---

## 11. FIRMAS

| Fase | Rol | Nombre | Fecha | Firma |
|------|-----|--------|-------|-------|
| Pre-despliegue | DevOps | | | |
| Pre-despliegue | Lead Dev | | | |
| Despliegue | DevOps | | | |
| Despliegue | Lead Dev | | | |
| Post-despliegue | QA | | | |
| Post-despliegue | Product Owner | | | |

---

## 12. ROLLBACK PROCEDURE

### Procedure de Rollback

```bash
# 1. Railway
 railway rollback

# 2. Docker (manual)
 docker pull <previous-image>
 docker run -p 3001:3001 <previous-image>

# 3. Database rollback (si necesario)
 bun run migrate.ts down
```

### Criterios de Rollback

| Condición | Acción |
|----------|--------|
| Health < 200 | Rollback inmediato |
| Errors > 10% | Rollback |
| Latency p95 > 2s | Alert + rollback si persiste |
| Login failures > 20% | Rollback |

---

**Documento generado:** 2026-04-14  
**Versión:** 1.0.0