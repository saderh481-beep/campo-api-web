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

function encodePhone(value?: string): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizePoint(value?: string): string | null {
  if (!value) return null;
  const match = value.trim().match(/^\(?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)?$/);
  if (!match) return null;
  return `(${match[1]},${match[2]})`;
}

async function existsLocalidadActiva(localidadId: string): Promise<boolean> {
  const [row] = await sql`
    SELECT id
    FROM localidades
    WHERE id = ${localidadId} AND activo = true
  `;
  return Boolean(row);
}

app.get("/", async (c) => {
  const user = c.get("user");
  const beneficiarios =
    user.rol === "administrador"
      ? await sql`
          SELECT b.id, b.tecnico_id, b.nombre, b.municipio, b.localidad, b.localidad_id,
                 b.direccion, b.cp, b.telefono_principal, b.telefono_secundario,
                 b.coord_parcela, b.activo, b.created_at, b.updated_at
          FROM beneficiarios b
           WHERE b.activo = true
          ORDER BY b.nombre
        `
      : await sql`
          SELECT b.id, b.tecnico_id, b.nombre, b.municipio, b.localidad, b.localidad_id,
                 b.direccion, b.cp, b.telefono_principal, b.telefono_secundario,
                 b.coord_parcela, b.activo, b.created_at, b.updated_at
          FROM beneficiarios b
          JOIN usuarios t ON t.id = b.tecnico_id AND t.rol = 'tecnico' AND t.activo = true
          JOIN tecnico_detalles td ON td.tecnico_id = t.id AND td.activo = true
           WHERE td.coordinador_id = ${user.sub} AND b.activo = true
          ORDER BY b.nombre
        `;
  return c.json(beneficiarios);
});

app.get(
  "/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
  const user = c.get("user");
  const { id } = c.req.valid("param");
  const [beneficiario] =
    user.rol === "administrador"
      ? await sql`SELECT * FROM beneficiarios WHERE id = ${id} AND activo = true`
      : await sql`
          SELECT b.*
          FROM beneficiarios b
          JOIN tecnico_detalles td ON td.tecnico_id = b.tecnico_id AND td.activo = true
          WHERE b.id = ${id} AND td.coordinador_id = ${user.sub} AND b.activo = true
        `;
  if (!beneficiario) return c.json({ error: "Beneficiario no encontrado" }, 404);

  const cadenas = await sql`
    SELECT cp.id, cp.nombre
    FROM beneficiario_cadenas bc
    JOIN cadenas_productivas cp ON cp.id = bc.cadena_id
    WHERE bc.beneficiario_id = ${id} AND bc.activo = true AND cp.activo = true
  `;
  const documentos = await sql`
    SELECT id, tipo, nombre_original, r2_key, sha256, bytes, subido_por, created_at
    FROM documentos WHERE beneficiario_id = ${id}
  `;
  return c.json({ ...beneficiario, cadenas, documentos });
}
);

app.post(
  "/",
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2),
      municipio: z.string().min(1),
      localidad: z.string().optional(),
      localidad_id: z.string().uuid().optional(),
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

    if (body.localidad_id && !(await existsLocalidadActiva(body.localidad_id))) {
      return c.json({ error: "Localidad no encontrada o inactiva" }, 400);
    }

    const [tecnico] = await sql`
      SELECT t.id, td.coordinador_id
      FROM usuarios t
      LEFT JOIN tecnico_detalles td ON td.tecnico_id = t.id AND td.activo = true
      WHERE t.id = ${body.tecnico_id} AND t.rol = 'tecnico' AND t.activo = true
    `;
    if (!tecnico) return c.json({ error: "Técnico no encontrado o inactivo" }, 400);
    if (user.rol === "coordinador" && tecnico.coordinador_id !== user.sub) {
      return c.json({ error: "Sin permisos para asignar este técnico" }, 403);
    }

    const reserved = await sql.reserve();
    let nuevo: Record<string, unknown>;
    try {
      await reserved`BEGIN`;
      const [row] = await reserved`
        INSERT INTO beneficiarios (nombre, municipio, localidad, localidad_id, direccion, cp,
                                  telefono_principal, telefono_secundario, coord_parcela, tecnico_id)
        VALUES (${body.nombre}, ${body.municipio}, ${body.localidad ?? null},
                ${body.localidad_id ?? null}, ${body.direccion ?? null}, ${body.cp ?? null},
                ${encodePhone(body.telefono_principal)},
                ${encodePhone(body.telefono_secundario)}, ${coordParcela}::point, ${body.tecnico_id})
        RETURNING id, nombre, municipio, localidad, localidad_id, direccion, cp,
                  telefono_principal, telefono_secundario, coord_parcela, tecnico_id, activo, created_at, updated_at
      `;
      await reserved`
        INSERT INTO asignaciones_beneficiario (tecnico_id, beneficiario_id, asignado_por)
        VALUES (${body.tecnico_id}, ${row.id}, ${user.sub})
      `;
      await reserved`COMMIT`;
      nuevo = row;
    } catch (err) {
      await reserved`ROLLBACK`;
      throw err;
    } finally {
      reserved.release();
    }

    return c.json(nuevo, 201);
  }
);

app.patch(
  "/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2).optional(),
      municipio: z.string().optional(),
      localidad: z.string().optional(),
      localidad_id: z.string().uuid().optional(),
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
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const coordParcela = normalizePoint(body.coord_parcela);

    const [beneficiarioActual] =
      user.rol === "administrador"
        ? await sql`SELECT id, tecnico_id FROM beneficiarios WHERE id = ${id} AND activo = true`
        : await sql`
            SELECT b.id, b.tecnico_id
            FROM beneficiarios b
            JOIN tecnico_detalles td ON td.tecnico_id = b.tecnico_id AND td.activo = true
            WHERE b.id = ${id} AND td.coordinador_id = ${user.sub} AND b.activo = true
          `;
    if (!beneficiarioActual) return c.json({ error: "Beneficiario no encontrado" }, 404);

    if (body.coord_parcela && !coordParcela) {
      return c.json({ error: "coord_parcela debe tener formato 'x,y'" }, 400);
    }

    if (body.localidad_id && !(await existsLocalidadActiva(body.localidad_id))) {
      return c.json({ error: "Localidad no encontrada o inactiva" }, 400);
    }

    if (body.tecnico_id) {
      const [tecnico] = await sql`
        SELECT t.id, td.coordinador_id
        FROM usuarios t
        LEFT JOIN tecnico_detalles td ON td.tecnico_id = t.id AND td.activo = true
        WHERE t.id = ${body.tecnico_id} AND t.rol = 'tecnico' AND t.activo = true
      `;
      if (!tecnico) return c.json({ error: "Técnico no encontrado o inactivo" }, 400);
      if (user.rol === "coordinador" && tecnico.coordinador_id !== user.sub) {
        return c.json({ error: "Sin permisos para asignar este técnico" }, 403);
      }
    }

    const nuevoTecnicoId = body.tecnico_id;
    const reserved = await sql.reserve();
    let actualizado: Record<string, unknown>;
    try {
      await reserved`BEGIN`;
      const [row] = await reserved`
        UPDATE beneficiarios SET
          nombre      = COALESCE(${body.nombre ?? null}, nombre),
          municipio   = COALESCE(${body.municipio ?? null}, municipio),
          localidad   = COALESCE(${body.localidad ?? null}, localidad),
          localidad_id = COALESCE(${body.localidad_id ?? null}, localidad_id),
          direccion   = COALESCE(${body.direccion ?? null}, direccion),
          cp          = COALESCE(${body.cp ?? null}, cp),
          telefono_principal  = COALESCE(${encodePhone(body.telefono_principal)}, telefono_principal),
          telefono_secundario = COALESCE(${encodePhone(body.telefono_secundario)}, telefono_secundario),
          coord_parcela = COALESCE(${coordParcela}::point, coord_parcela),
          tecnico_id  = COALESCE(${nuevoTecnicoId ?? null}, tecnico_id),
          updated_at  = NOW()
        WHERE id = ${id}
        RETURNING id, nombre, municipio, localidad, localidad_id, direccion, cp,
                  telefono_principal, telefono_secundario, coord_parcela, tecnico_id, activo, created_at, updated_at
      `;
      if (nuevoTecnicoId && nuevoTecnicoId !== beneficiarioActual.tecnico_id) {
        await reserved`
          UPDATE asignaciones_beneficiario
          SET activo = false, removido_en = NOW()
          WHERE beneficiario_id = ${id} AND activo = true
        `;
        await reserved`
          INSERT INTO asignaciones_beneficiario (tecnico_id, beneficiario_id, asignado_por)
          VALUES (${nuevoTecnicoId}, ${id}, ${user.sub})
        `;
      }
      await reserved`COMMIT`;
      actualizado = row;
    } catch (err) {
      await reserved`ROLLBACK`;
      throw err;
    } finally {
      reserved.release();
    }

    return c.json(actualizado);
  }
);

app.delete(
  "/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
  const user = c.get("user");
  const { id } = c.req.valid("param");

  const [beneficiario] =
    user.rol === "administrador"
      ? await sql`SELECT id FROM beneficiarios WHERE id = ${id} AND activo = true`
      : await sql`
          SELECT b.id
          FROM beneficiarios b
          JOIN tecnico_detalles td ON td.tecnico_id = b.tecnico_id AND td.activo = true
          WHERE b.id = ${id} AND td.coordinador_id = ${user.sub} AND b.activo = true
        `;

  if (!beneficiario) return c.json({ error: "Beneficiario no encontrado" }, 404);

  const reserved = await sql.reserve();
  try {
    await reserved`BEGIN`;
    await reserved`
      UPDATE beneficiarios
      SET activo = false, updated_at = NOW()
      WHERE id = ${id} AND activo = true
    `;

    await reserved`
      UPDATE asignaciones_beneficiario
      SET activo = false, removido_en = NOW()
      WHERE beneficiario_id = ${id} AND activo = true
    `;
    await reserved`COMMIT`;
  } catch (err) {
    await reserved`ROLLBACK`;
    throw err;
  } finally {
    reserved.release();
  }

  return c.json({ message: "Beneficiario desactivado" });
}
);

app.post(
  "/:id/cadenas",
  requireRole("administrador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator("json", z.object({ cadena_ids: z.array(z.string().uuid()) })),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const { cadena_ids } = c.req.valid("json");

    const [beneficiario] =
      user.rol === "administrador"
        ? await sql`SELECT id FROM beneficiarios WHERE id = ${id} AND activo = true`
        : await sql`
            SELECT b.id
            FROM beneficiarios b
            JOIN tecnico_detalles td ON td.tecnico_id = b.tecnico_id AND td.activo = true
            WHERE b.id = ${id} AND td.coordinador_id = ${user.sub} AND b.activo = true
          `;
    if (!beneficiario) return c.json({ error: "Beneficiario no encontrado" }, 404);

    if (cadena_ids.length > 0) {
      const validas = await sql`
        SELECT id
        FROM cadenas_productivas
        WHERE id = ANY(${cadena_ids}::uuid[]) AND activo = true
      `;
      if (validas.length !== cadena_ids.length) {
        return c.json({ error: "Una o más cadenas no existen o están inactivas" }, 400);
      }
    }

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

app.post(
  "/:id/documentos",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
  const { id } = c.req.valid("param");
  const user = c.get("user");

  const [beneficiario] =
    user.rol === "administrador"
      ? await sql`SELECT id FROM beneficiarios WHERE id = ${id} AND activo = true`
      : await sql`
          SELECT b.id
          FROM beneficiarios b
          JOIN tecnico_detalles td ON td.tecnico_id = b.tecnico_id AND td.activo = true
          WHERE b.id = ${id} AND td.coordinador_id = ${user.sub} AND b.activo = true
        `;
  if (!beneficiario) return c.json({ error: "Beneficiario no encontrado" }, 404);

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
}
);

app.get(
  "/:id/documentos",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
  const { id } = c.req.valid("param");
  const user = c.get("user");

  const [beneficiario] =
    user.rol === "administrador"
      ? await sql`SELECT id FROM beneficiarios WHERE id = ${id} AND activo = true`
      : await sql`
          SELECT b.id
          FROM beneficiarios b
          JOIN tecnico_detalles td ON td.tecnico_id = b.tecnico_id AND td.activo = true
          WHERE b.id = ${id} AND td.coordinador_id = ${user.sub} AND b.activo = true
        `;
  if (!beneficiario) return c.json({ error: "Beneficiario no encontrado" }, 404);

  const docs = await sql`
    SELECT id, tipo, nombre_original, r2_key, sha256, bytes, subido_por, created_at
    FROM documentos WHERE beneficiario_id = ${id}
  `;
  return c.json(docs);
}
);

export default app;
