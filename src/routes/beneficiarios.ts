import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createHash } from "node:crypto";
import { sql } from "@/db";
import { subirDocumento } from "@/lib/cloudinary";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { JwtPayload } from "@/lib/jwt";

const app = new Hono<{
  Variables: {
    user: JwtPayload
  }
}>();
app.use("*", authMiddleware, requireRole("administrador", "coordinador"));

function encodePhone(value?: string): Buffer | null {
  if (!value) return null;
  return Buffer.from(value, "utf8");
}

function normalizePoint(value?: string): string | null {
  if (!value) return null;
  const match = value.trim().match(/^\(?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)?$/);
  if (!match) return null;
  return `(${match[1]},${match[2]})`;
}

app.get("/", async (c) => {
  const user = c.get("user");
  const beneficiarios =
    user.rol === "administrador"
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
    JOIN cadenas_productivas cp ON cp.id = bc.cadena_id
    WHERE bc.beneficiario_id = ${id} AND bc.activo = true
  `;
  const documentos = await sql`
    SELECT id, tipo, nombre_original, r2_key, sha256, bytes, subido_por, created_at
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
      municipio: z.string().min(1),
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
    const coordParcela = normalizePoint(body.coord_parcela);

    if (body.coord_parcela && !coordParcela) {
      return c.json({ error: "coord_parcela debe tener formato 'x,y'" }, 400);
    }

    const [tecnico] = await sql`
      SELECT id, coordinador_id FROM tecnicos
      WHERE id = ${body.tecnico_id} AND activo = true
    `;
    if (!tecnico) return c.json({ error: "Técnico no encontrado o inactivo" }, 400);
    if (user.rol === "coordinador" && tecnico.coordinador_id !== user.sub) {
      return c.json({ error: "Sin permisos para asignar este técnico" }, 403);
    }

    const [nuevo] = await sql`
      INSERT INTO beneficiarios (nombre, municipio, localidad, direccion, cp,
                                telefono_principal, telefono_secundario, coord_parcela, tecnico_id)
      VALUES (${body.nombre}, ${body.municipio}, ${body.localidad ?? null},
              ${body.direccion ?? null}, ${body.cp ?? null}, ${encodePhone(body.telefono_principal)},
              ${encodePhone(body.telefono_secundario)}, ${coordParcela}::point, ${body.tecnico_id})
      RETURNING id, nombre, municipio, localidad, direccion, cp,
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
    const user = c.get("user");
    const { id } = c.req.param();
    const body = c.req.valid("json");
    const coordParcela = normalizePoint(body.coord_parcela);

    if (body.coord_parcela && !coordParcela) {
      return c.json({ error: "coord_parcela debe tener formato 'x,y'" }, 400);
    }

    if (body.tecnico_id) {
      const [tecnico] = await sql`
        SELECT id, coordinador_id FROM tecnicos
        WHERE id = ${body.tecnico_id} AND activo = true
      `;
      if (!tecnico) return c.json({ error: "Técnico no encontrado o inactivo" }, 400);
      if (user.rol === "coordinador" && tecnico.coordinador_id !== user.sub) {
        return c.json({ error: "Sin permisos para asignar este técnico" }, 403);
      }
    }

    const [actualizado] = await sql`
      UPDATE beneficiarios SET
        nombre    = COALESCE(${body.nombre ?? null}, nombre),
        municipio = COALESCE(${body.municipio ?? null}, municipio),
        localidad = COALESCE(${body.localidad ?? null}, localidad),
        direccion = COALESCE(${body.direccion ?? null}, direccion),
        cp        = COALESCE(${body.cp ?? null}, cp),
        telefono_principal = COALESCE(${encodePhone(body.telefono_principal)}, telefono_principal),
        telefono_secundario = COALESCE(${encodePhone(body.telefono_secundario)}, telefono_secundario),
        coord_parcela = COALESCE(${coordParcela}::point, coord_parcela),
        tecnico_id  = COALESCE(${body.tecnico_id ?? null}, tecnico_id),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, nombre, municipio, localidad, direccion, cp,
                telefono_principal, telefono_secundario, coord_parcela, tecnico_id, activo, created_at, updated_at
    `;
    if (!actualizado) return c.json({ error: "Beneficiario no encontrado" }, 404);
    return c.json(actualizado);
  }
);

app.post(
  "/:id/cadenas",
  requireRole("administrador"),
  zValidator("json", z.object({ cadena_ids: z.array(z.string().uuid()) })),
  async (c) => {
    const { id } = c.req.param();
    const { cadena_ids } = c.req.valid("json");

    await sql`UPDATE beneficiario_cadenas SET activo = false WHERE beneficiario_id = ${id}`;
    if (cadena_ids.length > 0) {
      await sql`
        INSERT INTO beneficiario_cadenas (beneficiario_id, cadena_id, activo, asignado_en)
        SELECT ${id}, unnest(${cadena_ids}::uuid[]), true, NOW()
        ON CONFLICT (beneficiario_id, cadena_id)
        DO UPDATE SET activo = true, asignado_en = NOW()
      `;
    }
    return c.json({ message: "Cadenas actualizadas" });
  }
);

app.post("/:id/documentos", async (c) => {
  const { id } = c.req.param();
  const user = c.get("user");
  const formData = await c.req.formData();
  const archivo = formData.get("archivo") as File | null;
  const tipo = formData.get("tipo") as string | null;

  if (!archivo || !tipo) return c.json({ error: "Archivo y tipo son requeridos" }, 400);

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const publicId = `${id}_${Date.now()}`;
  const { secure_url } = await subirDocumento(buffer, `campo/docs/${id}`, publicId);

  const [doc] = await sql`
    INSERT INTO documentos (beneficiario_id, tipo, nombre_original, r2_key, sha256, bytes, subido_por)
    VALUES (${id}, ${tipo}, ${archivo.name}, ${secure_url}, ${sha256}, ${buffer.length}, ${user.sub})
    RETURNING id, tipo, nombre_original, r2_key, sha256, bytes, subido_por, created_at
  `;
  return c.json(doc, 201);
});

app.get("/:id/documentos", async (c) => {
  const { id } = c.req.param();
  const docs = await sql`
    SELECT id, tipo, nombre_original, r2_key, sha256, bytes, subido_por, created_at
    FROM documentos WHERE beneficiario_id = ${id}
  `;
  return c.json(docs);
});

export default app;
