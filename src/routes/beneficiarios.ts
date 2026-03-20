import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "@/db";
import { subirDocumento } from "@/lib/cloudinary";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { JwtPayload } from "@/lib/jwt";

const app = new Hono<{
  Variables: {
    user: JwtPayload
  }
}>();
app.use("*", authMiddleware, requireRole("admin", "coordinador"));

app.get("/", async (c) => {
  const user = c.get("user");
  const beneficiarios =
    user.rol === "admin"
      ? await sql`
          SELECT b.id, b.tecnico_id, b.nombre, b.municipio, b.localidad, b.direccion, b.cp, 
                 b.telefono_principal, b.telefono_secundario, b.coord_parcela, b.activo, b.created_at, b.updated_at
          FROM beneficiarios b
          ORDER BY b.nombre
        `
      : await sql`
          SELECT DISTINCT b.id, b.tecnico_id, b.nombre, b.municipio, b.localidad, b.direccion, b.cp, 
                         b.telefono_principal, b.telefono_secundario, b.coord_parcela, b.activo, b.created_at, b.updated_at
          FROM beneficiarios b
          JOIN asignaciones_beneficiario ab ON ab.beneficiario_id = b.id
          JOIN tecnicos t ON t.id = ab.tecnico_id
          WHERE t.coordinador_id = ${user.sub} AND ab.activo = true
          ORDER BY b.nombre
        `;
  return c.json(beneficiarios);
});

app.get("/:id", async (c) => {
  const { id } = c.req.param();
  const [beneficiario] = await sql`SELECT * FROM beneficiarios WHERE id = ${id}`;
  if (!beneficiario) return c.json({ error: "Beneficiario no encontrado" }, 404);

  const cadenas = await sql`
    SELECT cp.id, cp.nombre
    FROM beneficiario_cadenas bc
    JOIN cadenas_productivas cp ON cp.id = bc.cadena_productiva_id
    WHERE bc.beneficiario_id = ${id}
  `;
  const documentos = await sql`
    SELECT id, tipo, url, nombre_original, r2_key, sha256, bytes, subido_por, creado_en 
    FROM documentos WHERE beneficiario_id = ${id}
  `;
  return c.json({ ...beneficiario, cadenas, documentos });
});

app.post(
  "/",
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2),
      curp: z.string().length(18).optional(),
      municipio: z.string().optional(),
      localidad: z.string().optional(),
      direccion: z.string().optional(),
      cp: z.string().optional(),
      telefono_principal: z.string().optional(),
      telefono_secundario: z.string().optional(),
      coord_parcela: z.string().optional(),
      tecnico_id: z.string().uuid(),
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const user = c.get("user");

    const [tecnico] = await sql`
      SELECT id, coordinador_id FROM tecnicos
      WHERE id = ${body.tecnico_id} AND activo = true
    `;
    if (!tecnico) return c.json({ error: "Técnico no encontrado o inactivo" }, 400);
    if (user.rol === "coordinador" && tecnico.coordinador_id !== user.sub) {
      return c.json({ error: "Sin permisos para asignar este técnico" }, 403);
    }

    if (body.curp) {
      const [dup] = await sql`SELECT id FROM beneficiarios WHERE curp = ${body.curp}`;
      if (dup) return c.json({ error: "Ya existe un beneficiario con esa CURP", id: dup.id }, 409);
    }

    const [nuevo] = await sql`
      INSERT INTO beneficiarios (nombre, curp, municipio, localidad, direccion, cp, 
                                telefono_principal, telefono_secundario, coord_parcela, tecnico_id)
      VALUES (${body.nombre}, ${body.curp ?? null}, ${body.municipio ?? null}, ${body.localidad ?? null}, 
              ${body.direccion ?? null}, ${body.cp ?? null}, ${body.telefono_principal ?? null}, 
              ${body.telefono_secundario ?? null}, ${body.coord_parcela ?? null}, ${body.tecnico_id})
      RETURNING id, nombre, curp, municipio, localidad, direccion, cp, 
                telefono_principal, telefono_secundario, coord_parcela, tecnico_id, activo, created_at, updated_at
    `;
    return c.json(nuevo, 201);
  }
);

app.patch(
  "/:id",
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2).optional(),
      curp: z.string().length(18).optional(),
      municipio: z.string().optional(),
      localidad: z.string().optional(),
      direccion: z.string().optional(),
      cp: z.string().optional(),
      telefono_principal: z.string().optional(),
      telefono_secundario: z.string().optional(),
      coord_parcela: z.string().optional(),
      tecnico_id: z.string().uuid().optional(),
    })
  ),
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");
    const [actualizado] = await sql`
      UPDATE beneficiarios SET
        nombre    = COALESCE(${body.nombre ?? null}, nombre),
        curp      = COALESCE(${body.curp ?? null}, curp),
        municipio = COALESCE(${body.municipio ?? null}, municipio),
        localidad = COALESCE(${body.localidad ?? null}, localidad),
        direccion = COALESCE(${body.direccion ?? null}, direccion),
        cp        = COALESCE(${body.cp ?? null}, cp),
        telefono_principal = COALESCE(${body.telefono_principal ?? null}, telefono_principal),
        telefono_secundario = COALESCE(${body.telefono_secundario ?? null}, telefono_secundario),
        coord_parcela = COALESCE(${body.coord_parcela ?? null}, coord_parcela),
        tecnico_id  = COALESCE(${body.tecnico_id ?? null}, tecnico_id),
        actualizado_en = NOW()
      WHERE id = ${id}
      RETURNING id, nombre, curp, municipio, localidad, direccion, cp, 
                telefono_principal, telefono_secundario, coord_parcela, tecnico_id, activo, created_at, updated_at
    `;
    if (!actualizado) return c.json({ error: "Beneficiario no encontrado" }, 404);
    return c.json(actualizado);
  }
);

app.post(
  "/:id/cadenas",
  requireRole("admin"),
  zValidator("json", z.object({ cadena_ids: z.array(z.string().uuid()) })),
  async (c) => {
    const { id } = c.req.param();
    const { cadena_ids } = c.req.valid("json");

    await sql`DELETE FROM beneficiario_cadenas WHERE beneficiario_id = ${id}`;
    if (cadena_ids.length > 0) {
      await sql`
        INSERT INTO beneficiario_cadenas (beneficiario_id, cadena_productiva_id)
        SELECT ${id}, unnest(${cadena_ids}::uuid[])
        ON CONFLICT DO NOTHING
      `;
    }
    return c.json({ message: "Cadenas actualizadas" });
  }
);

app.post("/:id/documentos", async (c) => {
  const { id } = c.req.param();
  const formData = await c.req.formData();
  const archivo = formData.get("archivo") as File | null;
  const tipo = formData.get("tipo") as string | null;

  if (!archivo || !tipo) return c.json({ error: "Archivo y tipo son requeridos" }, 400);

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const publicId = `${id}_${Date.now()}`;
  const { secure_url } = await subirDocumento(buffer, `campo/docs/${id}`, publicId);

  const [doc] = await sql`
    INSERT INTO documentos (beneficiario_id, tipo, url, nombre_original)
    VALUES (${id}, ${tipo}, ${secure_url}, ${archivo.name})
    RETURNING id, tipo, url, nombre_original, r2_key, sha256, bytes, subido_por, creado_en
  `;
  return c.json(doc, 201);
});

app.get("/:id/documentos", async (c) => {
  const { id } = c.req.param();
  const docs = await sql`
    SELECT id, tipo, url, nombre_original, r2_key, sha256, bytes, subido_por, creado_en 
    FROM documentos WHERE beneficiario_id = ${id}
  `;
  return c.json(docs);
});

export default app;
