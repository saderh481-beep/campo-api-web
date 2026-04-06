const API_BASE = process.env.API_BASE ?? "http://localhost:3001";
const API_V1 = `${API_BASE}/api/v1`;

interface ApiOptions {
  method?: string;
  token?: string;
  body?: unknown;
}

async function req<T>(path: string, options?: ApiOptions): Promise<{ status: number; body: T }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options?.token) headers["Authorization"] = `Bearer ${options.token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: options?.method ?? "GET",
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  return { status: res.status, body: await res.json().catch(() => ({})) as T };
}

async function login(correo: string, codigo: string): Promise<string> {
  const { status, body } = await req<{ token?: string; error?: string }>("/api/v1/auth/login", {
    method: "POST",
    body: { correo, codigo_acceso: codigo },
  });
  if (status !== 200 || !body.token) throw new Error(`Login falló: ${body.error}`);
  return body.token;
}

async function main() {
  console.log(`🚀 Pruebas API: ${API_BASE}\n`);
  let adminToken = "", coordToken = "", tecnicoToken = "";

  try {
    console.log("📋 Health");
    console.log(`  GET /health → ${(await req("/health")).status === 200 ? "✅" : "❌"}`);
    console.log(`  GET /api/v1/health → ${(await req("/api/v1/health")).status === 200 ? "✅" : "❌"}`);

    console.log("\n🔐 Login");
    adminToken = await login("admin@campo.local", "654321");
    console.log(`  admin@campo.local/654321 → ✅`);
    coordToken = await login("coordinador@campo.local", "654322");
    console.log(`  coordinador@campo.local/654322 → ✅`);
    tecnicoToken = await login("tecnico1@campo.local", "12345");
    console.log(`  tecnico1@campo.local/12345 → ✅`);

    console.log("\n👥 GET /api/v1/usuarios");
    const u = await req("/api/v1/usuarios", { token: adminToken });
    console.log(`  → ${u.status === 200 ? "✅" : "❌"} ${u.status}`);

    console.log("\n🔧 GET /api/v1/tecnicos");
    const t1 = await req("/api/v1/tecnicos", { token: adminToken });
    console.log(`  (admin) → ${t1.status === 200 ? "✅" : "❌"} ${t1.status}`);
    const t2 = await req("/api/v1/tecnicos", { token: coordToken });
    console.log(`  (coord) → ${t2.status === 200 ? "✅" : "❌"} ${t2.status}`);

    console.log("\n📝 GET /api/v1/actividades");
    const a = await req("/api/v1/actividades", { token: adminToken });
    console.log(`  → ${a.status === 200 ? "✅" : "❌"} ${a.status}`);

    console.log("\n🏭 GET /api/v1/cadenas");
    const c = await req("/api/v1/cadenas", { token: adminToken });
    console.log(`  → ${c.status === 200 ? "✅" : "❌"} ${c.status}`);

    console.log("\n🗺️ GET /api/v1/zonas");
    const z = await req("/api/v1/zonas", { token: adminToken });
    console.log(`  → ${z.status === 200 ? "✅" : "❌"} ${z.status}`);

    console.log("\n⚙️ GET /api/v1/configuraciones");
    const cfg = await req("/api/v1/configuraciones", { token: adminToken });
    console.log(`  → ${cfg.status === 200 ? "✅" : "❌"} ${cfg.status}`);

    console.log("\n👤 GET /api/v1/beneficiarios");
    const b = await req("/api/v1/beneficiarios", { token: adminToken });
    console.log(`  → ${b.status === 200 ? "✅" : "❌"} ${b.status}`);

    console.log("\n📋 GET /api/v1/bitacoras");
    const bit = await req("/api/v1/bitacoras", { token: adminToken });
    console.log(`  → ${bit.status === 200 ? "✅" : "❌"} ${bit.status}`);

    console.log("\n📊 GET /api/v1/reportes/mensual");
    const rep = await req("/api/v1/reportes/mensual", { token: adminToken });
    console.log(`  → ${rep.status === 200 ? "✅" : "❌"} ${rep.status}`);

    console.log("\n🔒 Permisos");
    const denied = await req("/api/v1/usuarios", { token: tecnicoToken });
    console.log(`  tecnico en /usuarios → ${denied.status === 403 ? "✅ 403" : "❌ " + denied.status}`);

    console.log("\n✅ Pruebas completadas");
  } catch (e) {
    console.error("\n❌ Error:", e);
    process.exit(1);
  }
}

main();
