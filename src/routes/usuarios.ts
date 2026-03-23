import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { hash } from "bcryptjs";
import { randomInt } from "node:crypto";
import { sql } from "@/db";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { JwtPayload } from "@/lib/jwt";

const app = new Hono<{
  Variables: {
    user: JwtPayload;
  };
}>();

app.use("*", authMiddleware);
app.use("*", requireRole("administrador"));

function getCodeLengthByRole(rol: string): number {
  if (rol === "tecnico") return 5;
  return 6;
}

async function generarCodigoAccesoUnico(length: number): Promise<string> {
  const min = 10 ** (length - 1);
  const max = 10 ** length;

  while (true) {
    const candidate = randomInt(min, max).toString();
    const [exists] = await sql`SELECT id FROM usuarios WHERE codigo_acceso = ${candidate} LIMIT 1`;
    if (!exists) return candidate;
  }
}

app.get("/", async (c) => {
  const usuarios = await sql`
    SELECT id, nombre, correo, rol, codigo_acceso, activo, created_at, updated_at
    FROM usuarios
    ORDER BY created_at DESC
  `;
  return c.json(usuarios);
});

app.post(
  "/",
  zValidator(
    "json",
    z.object({
      correo: z.string().email(),
      nombre: z.string().min(2),
      rol: z.enum(["tecnico", "coordinador", "administrador"]),
      telefono: z.string().optional(),
      coordinador_id: z.string().uuid().optional(),
      fecha_limite: z.string().datetime().optional(),
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const [existe] = await sql`SELECT id FROM usuarios WHERE correo = ${body.correo}`;
    if (existe) return c.json({ error: "El correo ya está registrado" }, 409);

    if (body.rol === "tecnico") {
      if (!body.coordinador_id || !body.fecha_limite) {
        return c.json(
          { error: "Para rol técnico se requiere coordinador_id y fecha_limite" },
          400
        );
      }

      const [coordinador] = await sql`
        SELECT id FROM usuarios
        WHERE id = ${body.coordinador_id} AND rol = 'coordinador' AND activo = true
      `;
      if (!coordinador) {
        return c.json({ error: "Coordinador inválido o inactivo" }, 400);
      }

      const [dupTecnico] = await sql`
        SELECT id FROM tecnicos WHERE correo = ${body.correo} AND activo = true
      `;
      if (dupTecnico) return c.json({ error: "Ya existe un técnico activo con ese correo" }, 409);
    }

    const length = getCodeLengthByRole(body.rol);
    const codigoAcceso = await generarCodigoAccesoUnico(length);
    const hashCodigoAcceso = await hash(codigoAcceso, 12);

    const [nuevo] = await sql`
      INSERT INTO usuarios (correo, nombre, rol, codigo_acceso, hash_codigo_acceso)
      VALUES (${body.correo}, ${body.nombre}, ${body.rol}, ${codigoAcceso}, ${hashCodigoAcceso})
      RETURNING id, nombre, correo, rol, codigo_acceso, activo, created_at, updated_at
    `;

    if (body.rol === "tecnico") {
      await sql`
        INSERT INTO tecnicos (nombre, correo, telefono, coordinador_id, fecha_limite, codigo_acceso, activo)
        VALUES (
          ${body.nombre},
          ${body.correo},
          ${body.telefono ?? null},
          ${body.coordinador_id!},
          ${body.fecha_limite!},
          ${codigoAcceso},
          true
        )
      `;
    }

    return c.json({ ...nuevo, codigo_acceso: codigoAcceso }, 201);
  }
);

app.patch(
  "/:id",
  zValidator(
    "json",
    z.object({
      nombre: z.string().min(2).optional(),
      correo: z.string().email().optional(),
      rol: z.enum(["tecnico", "coordinador", "administrador"]).optional(),
      codigo_acceso: z.string().regex(/^\d{5,6}$/).optional(),
      telefono: z.string().optional(),
      coordinador_id: z.string().uuid().optional(),
      fecha_limite: z.string().datetime().optional(),
    })
  ),
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid("json");

    const [usuario] = await sql`
      SELECT id, nombre, correo, rol, codigo_acceso
      FROM usuarios
      WHERE id = ${id}
    `;
    if (!usuario) return c.json({ error: "Usuario no encontrado" }, 404);

    if (body.correo) {
      const [dupCorreo] = await sql`
        SELECT id FROM usuarios
        WHERE correo = ${body.correo} AND id <> ${id}
      `;
      if (dupCorreo) return c.json({ error: "El correo ya está registrado" }, 409);
    }

    const rolFinal = body.rol ?? usuario.rol;

    if (body.codigo_acceso) {
      const expectedLength = getCodeLengthByRole(rolFinal);
      if (!new RegExp(`^\\d{${expectedLength}}$`).test(body.codigo_acceso)) {
        return c.json({ error: `El codigo_acceso para rol ${rolFinal} debe tener ${expectedLength} dígitos` }, 400);
      }
    }

    if (rolFinal === "tecnico" && body.coordinador_id) {
      const [coordinador] = await sql`
        SELECT id FROM usuarios
        WHERE id = ${body.coordinador_id} AND rol = 'coordinador' AND activo = true
      `;
      if (!coordinador) {
        return c.json({ error: "Coordinador inválido o inactivo" }, 400);
      }
    }

    if (rolFinal === "tecnico") {
      const correoTecnico = body.correo ?? usuario.correo;

      const [dupTecnico] = await sql`
        SELECT id FROM tecnicos
        WHERE correo = ${correoTecnico} AND correo <> ${usuario.correo} AND activo = true
        LIMIT 1
      `;
      if (dupTecnico) {
        return c.json({ error: "Ya existe un técnico activo con ese correo" }, 409);
      }

      const [tecnicoExistente] = await sql`
        SELECT id FROM tecnicos WHERE correo = ${usuario.correo} LIMIT 1
      `;
      if (!tecnicoExistente && (!body.coordinador_id || !body.fecha_limite)) {
        return c.json(
          {
            error: "Para convertir a técnico se requiere coordinador_id y fecha_limite",
          },
          400
        );
      }
    }

    const codigoAccesoFinal = body.codigo_acceso ?? usuario.codigo_acceso;
    const hashCodigoAccesoFinal = codigoAccesoFinal
      ? await hash(codigoAccesoFinal, 12)
      : null;

    const [actualizado] = await sql`
      UPDATE usuarios SET
        nombre = COALESCE(${body.nombre ?? null}, nombre),
        correo = COALESCE(${body.correo ?? null}, correo),
        rol    = COALESCE(${body.rol ?? null}, rol),
        codigo_acceso = COALESCE(${codigoAccesoFinal ?? null}, codigo_acceso),
        hash_codigo_acceso = COALESCE(${hashCodigoAccesoFinal}, hash_codigo_acceso),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, nombre, correo, rol, codigo_acceso, activo, created_at, updated_at
    `;

    if (rolFinal === "tecnico") {
      const correoFinal = body.correo ?? actualizado.correo;
      const nombreFinal = body.nombre ?? actualizado.nombre;

      const [tecnico] = await sql`
        SELECT id FROM tecnicos WHERE correo = ${usuario.correo} LIMIT 1
      `;

      if (tecnico) {
        await sql`
          UPDATE tecnicos SET
            nombre = ${nombreFinal},
            correo = ${correoFinal},
            telefono = COALESCE(${body.telefono ?? null}, telefono),
            coordinador_id = COALESCE(${body.coordinador_id ?? null}, coordinador_id),
            fecha_limite = COALESCE(${body.fecha_limite ?? null}, fecha_limite),
            codigo_acceso = COALESCE(${codigoAccesoFinal ?? null}, codigo_acceso),
            activo = true,
            updated_at = NOW()
          WHERE id = ${tecnico.id}
        `;
      } else {
        await sql`
          INSERT INTO tecnicos (nombre, correo, telefono, coordinador_id, fecha_limite, codigo_acceso, activo)
          VALUES (
            ${nombreFinal},
            ${correoFinal},
            ${body.telefono ?? null},
            ${body.coordinador_id!},
            ${body.fecha_limite!},
            ${codigoAccesoFinal},
            true
          )
        `;
      }
    } else if (usuario.rol === "tecnico" && rolFinal !== "tecnico") {
      await sql`
        UPDATE tecnicos
        SET activo = false, updated_at = NOW()
        WHERE correo = ${usuario.correo}
      `;
    }

    return c.json(actualizado);
  }
);

app.delete("/:id", async (c) => {
  const { id } = c.req.param();
  const user = c.get("user");
  if (user.sub === id) return c.json({ error: "No puedes desactivar tu propia cuenta" }, 400);

  const [usuario] = await sql`
    UPDATE usuarios SET activo = false, updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, nombre, correo, rol
  `;
  if (!usuario) return c.json({ error: "Usuario no encontrado" }, 404);

  if (usuario.rol === "tecnico") {
    await sql`
      UPDATE tecnicos SET activo = false, updated_at = NOW()
      WHERE correo = ${usuario.correo}
    `;
  }

  return c.json({ message: "Usuario desactivado" });
});

export default app;
