#!/usr/bin/env bun
/**
 * Test: Login Flow con Tokens
 * Sistema: Campo API Web
 * Prioridad: CRÍTICA
 * 
 * Métricas objetivo:
 * - Login TTFB: ≤ 200ms (crítico: > 500ms)
 * - Estructura respuesta: token + usuario + rol
 * - Logout invalida token: YES
 */

const TEST_API_BASE = process.env.TEST_API_BASE || process.env.API_BASE || "http://localhost:3001";

interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
}

interface LoginResponse {
  token?: string;
  usuario?: Usuario;
  error?: string;
}

interface TestMetrics {
  ttfb: number;
  status: number;
  hasToken: boolean;
  hasUsuario: boolean;
  tokenInvalidated: boolean;
  passed: boolean;
}

async function testLoginFlow(adminEmail: string, adminCode: string): Promise<TestMetrics> {
  const metrics: TestMetrics = {
    ttfb: 0,
    status: 0,
    hasToken: false,
    hasUsuario: false,
    tokenInvalidated: false,
    passed: false,
  };

  console.log("=".repeat(50));
  console.log("TEST: Login Flow con Tokens");
  console.log("=".repeat(50));
  console.log(`User: ${adminEmail}`);
  console.log(`API:  ${TEST_API_BASE}/api/v1/auth/login`);
  console.log("-".repeat(50));

  // 1. Login exitoso
  console.log("\n[1/5] Login con credenciales válidas...");
  const startLogin = Date.now();
  
  const loginRes = await fetch(`${TEST_API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo: adminEmail, codigo_acceso: adminCode }),
  });
  
  metrics.ttfb = Date.now() - startLogin;
  metrics.status = loginRes.status;
  
  const loginData: LoginResponse = await loginRes.json().catch(() => ({ error: "Parse error" }));
  
  console.log(`  Status: ${loginRes.status}`);
  console.log(`  TTFB:  ${metrics.ttfb}ms`);
  console.log(`  Target: ≤ 200ms | Crítico: > 500ms`);

  if (loginRes.status !== 200) {
    console.log(`  ❌ Login falló: ${loginData.error || "Sin error"}`);
    return metrics;
  }

  // 2. Validar estructura
  console.log("\n[2/5] Validar estructura de respuesta...");
  metrics.hasToken = !!loginData.token;
  metrics.hasUsuario = !!loginData.usuario?.id;
  
  console.log(`  token:   ${metrics.hasToken ? "✅" : "❌"} (${loginData.token?.substring(0, 20)}...)`);
  console.log(`  usuario: ${metrics.hasUsuario ? "✅" : "❌"} (${loginData.usuario?.rol})`);

  if (!loginData.token || !loginData.usuario) {
    console.log("  ❌ Estructura inválida");
    return metrics;
  }

  // 3. Acceder endpoint protegido
  console.log("\n[3/5] Acceder endpoint protegido (/usuarios)...");
  const token = loginData.token;
  
  const protectedRes = await fetch(`${TEST_API_BASE}/api/v1/usuarios`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  
  console.log(`  Status: ${protectedRes.status} (esperado: 200)`);
  if (protectedRes.status === 200) {
    const data = await protectedRes.json();
    console.log(`  Usuarios: ${Array.isArray(data) ? data.length : "?"}`);
  }

  // 4. Logout
  console.log("\n[4/5] Logout...");
  
  const logoutRes = await fetch(`${TEST_API_BASE}/api/v1/auth/logout`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  
  console.log(`  Status: ${logoutRes.status}`);

  // 5. Verificar token invalidado
  console.log("\n[5/5] Verificar token después de logout...");
  
  const afterLogout = await fetch(`${TEST_API_BASE}/api/v1/usuarios`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  
  metrics.tokenInvalidated = afterLogout.status === 401;
  
  console.log(`  Status: ${afterLogout.status} (esperado: 401)`);
  console.log(`  Token invalidado: ${metrics.tokenInvalidated ? "✅ YES" : "❌ NO"}`);

  // Resultado final
  metrics.passed = metrics.hasToken && metrics.hasUsuario && metrics.tokenInvalidated;

  console.log("\n" + "=".repeat(50));
  console.log("RESULTADO");
  console.log("=".repeat(50));
  console.log(`TTFB:             ${metrics.ttfb}ms  ${metrics.ttfb <= 200 ? "✅" : metrics.ttfb > 500 ? "❌" : "⚠️"}`);
  console.log(`Token received:   ${metrics.hasToken ? "✅" : "❌"}`);
  console.log(`Usuario:        ${metrics.hasUsuario ? "✅" : "❌"}`);
  console.log(`Token invalidado: ${metrics.tokenInvalidated ? "✅" : "❌"}`);
  console.log("-".repeat(50));
  console.log(`FINAL: ${metrics.passed ? "✅ PASS" : "❌ FAIL"}`);
  console.log("=".repeat(50));

  return metrics;
}

async function testErrorCases() {
  console.log("\n" + "=".repeat(50));
  console.log("TEST: Casos de Error");
  console.log("=".repeat(50));

  const cases = [
    { 
      name: "Credenciales inválidas", 
      body: { correo: "invalid@campo.local", codigo_acceso: "000000" },
      expect: 401,
    },
    { 
      name: "Código corto", 
      body: { correo: "admin@campo.local", codigo_acceso: "123" },
      expect: 400,
    },
    { 
      name: "Email inválido", 
      body: { correo: "not-an-email", codigo_acceso: "654321" },
      expect: 400,
    },
    { 
      name: "Sin token", 
      headers: {},
      expect: 401,
    },
  ];

  for (const tc of cases) {
    console.log(`\n[Error] ${tc.name}...`);
    
    const res = await fetch(`${TEST_API_BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...tc.headers,
      },
      body: tc.body ? JSON.stringify(tc.body) : undefined,
    });
    
    const pass = res.status === tc.expect;
    console.log(`  Status: ${res.status} (esperado: ${tc.expect}) ${pass ? "✅" : "❌"}`);
  }
}

async function runTests() {
  const adminEmail = process.env.TEST_ADMIN_EMAIL || "admin@campo.local";
  const adminCode = process.env.TEST_ADMIN_CODE || "654321";
  
  console.log("\n🎯 Campo API Web - Login Flow Tests");
  console.log("=".repeat(50));
  
  // Test principal
  const metrics = await testLoginFlow(adminEmail, adminCode);
  
  // Test errores (opcional)
  // await testErrorCases();
  
  process.exit(metrics.passed ? 0 : 1);
}

runTests();