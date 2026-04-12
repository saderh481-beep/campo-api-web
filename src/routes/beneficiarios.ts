import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createHash } from "node:crypto";
import { sql } from "@/db";
import { uploadBeneficiarioDocumentos } from "@/lib/files";
import { authMiddleware, requireRole } from "@/middleware/auth";
import type { JwtPayload } from "@/lib/jwt";
import {
  listBeneficiariosByUser,
  findBeneficiarioByIdWithAccess,
  findBeneficiarioWithRelations,
  findBeneficiarioById,
  existsTecnicoActivo,
  existsTecnicoActivoWithCoordinador,
  createBeneficiarioWithAsignacion,
  updateBeneficiarioWithAsignacion,
  deactivateBeneficiario,
  deleteBeneficiarioFisico,
  createBeneficiario,
  updateBeneficiario,
} from "@/models/beneficiarios.model";
import { updateBeneficiarioCadenas, getCadenasByBeneficiarioId } from "@/models/beneficiario_cadenas.model";
import { createDocumento, listDocumentosByBeneficiarioId } from "@/models/documentos.model";
import { existsCadenasActivasByIds } from "@/models/cadenas.model";
import { existsLocalidadActiva } from "@/models/localidades.model";

const app = new Hono<{
  Variables: {
    user: JwtPayload
  }
}>();
app.use("*", authMiddleware, requireRole("admin", "coordinador"));

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

app.get("/", async (c) => {
  try {
    const user = c.get("user");
    const beneficiarios = await listBeneficiariosByUser(user.sub, user.rol);
    return c.json(beneficiarios);
  } catch (e) {
    console.error("[Beneficiarios] Error al listar:", e);
    return c.json({ error: "Error al obtener beneficiarios" }, 500);
  }
});

app.get(
  "/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const user = c.get("user");
      const { id } = c.req.valid("param");
      const beneficiario = await findBeneficiarioWithRelations(id);
      if (!beneficiario) return c.json({ error: "Beneficiario no encontrado" }, 404);
      
      if (user.rol !== "admin") {
        const beneficiarioBase = await findBeneficiarioById(id);
        if (!beneficiarioBase) return c.json({ error: "Beneficiario no encontrado" }, 404);
        const hasAccess = await existsTecnicoActivoWithCoordinador(beneficiarioBase.tecnico_id, user.sub);
        if (!hasAccess) return c.json({ error: "Beneficiario no encontrado" }, 404);
      }
      return c.json(beneficiario);
    } catch (e) {
      console.error("[Beneficiarios] Error al obtener:", e);
      return c.json({ error: "Error al obtener beneficiario" }, 500);
    }
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
    try {
      const body = c.req.valid("json");
      const user = c.get("user");
      console.log("[Beneficiarios] POST body:", JSON.stringify(body));

      const tecnicoValido = await existsTecnicoActivo(body.tecnico_id);
      console.log("[Beneficiarios] técnico válido:", tecnicoValido);
      if (!tecnicoValido) {
        console.log("[Beneficiarios] ERROR: Técnico no encontrado o inactivo:", body.tecnico_id);
        return c.json({ error: "Técnico no encontrado o inactivo" }, 400);
      }

      if (body.localidad_id && !(await existsLocalidadActiva(body.localidad_id))) {
        return c.json({ error: "Localidad no encontrada o inactiva" }, 400);
      }

      const coordParcela = normalizePoint(body.coord_parcela);
      if (body.coord_parcela && !coordParcela) {
        return c.json({ error: "coord_parcela debe tener formato 'x,y'" }, 400);
      }
      
      if (user.rol === "coordinador") {
        const tieneAcceso = await existsTecnicoActivoWithCoordinador(body.tecnico_id, user.sub);
        if (!tieneAcceso) return c.json({ error: "Sin permisos para asignar este técnico" }, 403);
      }

      const nuevo = await createBeneficiarioWithAsignacion(
        { ...body, coordParcela: coordParcela },
        user.sub
      );
      if (!nuevo) return c.json({ error: "Error al crear beneficiario" }, 500);
      return c.json(nuevo, 201);
    } catch (e) {
      console.error("[Beneficiarios] Error al crear:", e);
      return c.json({ error: "Error al crear beneficiario" }, 500);
    }
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
    try {
      const user = c.get("user");
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const coordParcela = normalizePoint(body.coord_parcela);

      const beneficiarioActual = await findBeneficiarioByIdWithAccess(id, user.sub, user.rol);
      if (!beneficiarioActual) return c.json({ error: "Beneficiario no encontrado" }, 404);

      if (body.coord_parcela && !coordParcela) {
        return c.json({ error: "coord_parcela debe tener formato 'x,y'" }, 400);
      }

      if (body.localidad_id && !(await existsLocalidadActiva(body.localidad_id))) {
        return c.json({ error: "Localidad no encontrada o inactiva" }, 400);
      }

      if (body.tecnico_id) {
        const tecnicoValido = await existsTecnicoActivo(body.tecnico_id);
        if (!tecnicoValido) return c.json({ error: "Técnico no encontrado o inactivo" }, 400);
        if (user.rol === "coordinador") {
          const tieneAcceso = await existsTecnicoActivoWithCoordinador(body.tecnico_id, user.sub);
          if (!tieneAcceso) return c.json({ error: "Sin permisos para asignar este técnico" }, 403);
        }
      }

      const nuevoTecnicoId = body.tecnico_id;
      let actualizado;
      
      if (nuevoTecnicoId && nuevoTecnicoId !== beneficiarioActual.tecnico_id) {
        actualizado = await updateBeneficiarioWithAsignacion(
          id,
          beneficiarioActual.tecnico_id,
          nuevoTecnicoId,
          user.sub,
          { ...body, coordParcela: coordParcela }
        );
      } else {
        actualizado = await updateBeneficiario(id, { ...body, coordParcela: coordParcela });
      }
      
      if (!actualizado) return c.json({ error: "Error al actualizar beneficiario" }, 500);
      return c.json(actualizado);
    } catch (e) {
      console.error("[Beneficiarios] Error al actualizar:", e);
      return c.json({ error: "Error al actualizar beneficiario" }, 500);
    }
  }
);

app.delete(
  "/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const user = c.get("user");
      const { id } = c.req.valid("param");

      const beneficiario = await findBeneficiarioByIdWithAccess(id, user.sub, user.rol);
      if (!beneficiario) return c.json({ error: "Beneficiario no encontrado" }, 404);

      await deactivateBeneficiario(id);
      return c.json({ message: "Beneficiario desactivado" });
    } catch (e) {
      console.error("[Beneficiarios] Error al desactivar:", e);
      return c.json({ error: "Error al desactivar beneficiario" }, 500);
    }
  }
);

app.delete(
  "/:id/force",
  requireRole("admin"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const user = c.get("user");
      const { id } = c.req.valid("param");

      const beneficiario = await findBeneficiarioById(id);
      if (!beneficiario) return c.json({ error: "Beneficiario no encontrado" }, 404);

      await deleteBeneficiarioFisico(id);
      return c.json({ message: "Beneficiario eliminado" });
    } catch (e) {
      console.error("[Beneficiarios] Error al eliminar:", e);
      return c.json({ error: "Error al eliminar beneficiario" }, 500);
    }
  }
);

app.post(
  "/:id/cadenas",
  requireRole("admin"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator("json", z.object({ cadena_ids: z.array(z.string().uuid()) })),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const { cadena_ids } = c.req.valid("json");

      const beneficiario = await findBeneficiarioById(id);
      if (!beneficiario) return c.json({ error: "Beneficiario no encontrado" }, 404);

      if (cadena_ids.length > 0) {
        const validas = await existsCadenasActivasByIds(cadena_ids);
        if (!validas) {
          return c.json({ error: "Una o más cadenas no existen o están inactivas" }, 400);
        }
      }

      await updateBeneficiarioCadenas(id, cadena_ids);
      return c.json({ message: "Cadenas actualizadas" });
    } catch (e) {
      console.error("[Beneficiarios] Error al actualizar cadenas:", e);
      return c.json({ error: "Error al actualizar cadenas" }, 500);
    }
  }
);

app.post(
  "/:id/documentos",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const user = c.get("user");

      const beneficiario = await findBeneficiarioByIdWithAccess(id, user.sub, user.rol);
      if (!beneficiario) return c.json({ error: "Beneficiario no encontrado" }, 404);

      const formData = await c.req.formData();
      const archivo = formData.get("archivo") as File | null;
      const tipo = formData.get("tipo") as string | null;

      if (!archivo || !tipo) return c.json({ error: "Archivo y tipo son requeridos" }, 400);

      const sha256 = createHash("sha256").update(Buffer.from(await archivo.arrayBuffer())).digest("hex");
      const result = await uploadBeneficiarioDocumentos(id, [archivo]);
      const { url: secure_url } = result.documentos[0];

      const doc = await createDocumento({
        beneficiario_id: id,
        tipo,
        nombre_original: archivo.name,
        r2_key: secure_url,
        sha256,
        bytes: archivo.size,
        subido_por: user.sub,
      });
      return c.json(doc, 201);
    } catch (e) {
      console.error("[Beneficiarios] Error al subir documento:", e);
      return c.json({ error: "Error al subir documento" }, 500);
    }
  }
);

app.get(
  "/:id/documentos",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const user = c.get("user");

      const beneficiario = await findBeneficiarioByIdWithAccess(id, user.sub, user.rol);
      if (!beneficiario) return c.json({ error: "Beneficiario no encontrado" }, 404);

      const docs = await listDocumentosByBeneficiarioId(id);
      return c.json(docs);
    } catch (e) {
      console.error("[Beneficiarios] Error al listar documentos:", e);
      return c.json({ error: "Error al obtener documentos" }, 500);
    }
  }
);

app.post(
  "/:id/foto-rostro",
  requireRole("admin", "coordinador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const user = c.get("user");

      const beneficiario = await findBeneficiarioByIdWithAccess(id, user.sub, user.rol);
      if (!beneficiario) return c.json({ error: "Beneficiario no encontrado" }, 404);

      const formData = await c.req.formData();
      const archivo = formData.get("archivo") as File | null;
      if (!archivo) return c.json({ error: "Archivo requerido" }, 400);

      const result = await uploadBeneficiarioDocumentos(id, [archivo]);
      const { url: secure_url } = result.documentos[0];

      await sql`
        UPDATE beneficiarios SET foto_rostro_url = ${secure_url}, updated_at = NOW()
        WHERE id = ${id}
      `;

      return c.json({ url: secure_url });
    } catch (e) {
      console.error("[Beneficiarios] Error al subir foto rostro:", e);
      return c.json({ error: "Error al subir foto" }, 500);
    }
  }
);

app.get(
  "/:id/foto-rostro",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const user = c.get("user");

      const beneficiario = await findBeneficiarioByIdWithAccess(id, user.sub, user.rol);
      if (!beneficiario) return c.json({ error: "Beneficiario no encontrado" }, 404);

      return c.json({ url: beneficiario.foto_rostro_url });
    } catch (e) {
      console.error("[Beneficiarios] Error al obtener foto rostro:", e);
      return c.json({ error: "Error al obtener foto" }, 500);
    }
  }
);

app.delete(
  "/:id/foto-rostro",
  requireRole("admin", "coordinador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const user = c.get("user");

      const beneficiario = await findBeneficiarioByIdWithAccess(id, user.sub, user.rol);
      if (!beneficiario) return c.json({ error: "Beneficiario no encontrado" }, 404);

      await sql`
        UPDATE beneficiarios SET foto_rostro_url = null, updated_at = NOW()
        WHERE id = ${id}
      `;

      return c.json({ message: "Foto eliminada" });
    } catch (e) {
      console.error("[Beneficiarios] Error al eliminar foto rostro:", e);
      return c.json({ error: "Error al eliminar foto" }, 500);
    }
  }
);

app.post(
  "/:id/firma",
  requireRole("admin", "coordinador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const user = c.get("user");

      const beneficiario = await findBeneficiarioByIdWithAccess(id, user.sub, user.rol);
      if (!beneficiario) return c.json({ error: "Beneficiario no encontrado" }, 404);

      const formData = await c.req.formData();
      const archivo = formData.get("archivo") as File | null;
      if (!archivo) return c.json({ error: "Archivo requerido" }, 400);

      const result = await uploadBeneficiarioDocumentos(id, [archivo]);
      const { url: secure_url } = result.documentos[0];

      await sql`
        UPDATE beneficiarios SET firma_url = ${secure_url}, updated_at = NOW()
        WHERE id = ${id}
      `;

      return c.json({ url: secure_url });
    } catch (e) {
      console.error("[Beneficiarios] Error al subir firma:", e);
      return c.json({ error: "Error al subir firma" }, 500);
    }
  }
);

app.get(
  "/:id/firma",
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const user = c.get("user");

      const beneficiario = await findBeneficiarioByIdWithAccess(id, user.sub, user.rol);
      if (!beneficiario) return c.json({ error: "Beneficiario no encontrado" }, 404);

      return c.json({ url: beneficiario.firma_url });
    } catch (e) {
      console.error("[Beneficiarios] Error al obtener firma:", e);
      return c.json({ error: "Error al obtener firma" }, 500);
    }
  }
);

app.delete(
  "/:id/firma",
  requireRole("admin", "coordinador"),
  zValidator("param", z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const user = c.get("user");

      const beneficiario = await findBeneficiarioByIdWithAccess(id, user.sub, user.rol);
      if (!beneficiario) return c.json({ error: "Beneficiario no encontrado" }, 404);

      await sql`
        UPDATE beneficiarios SET firma_url = null, updated_at = NOW()
        WHERE id = ${id}
      `;

      return c.json({ message: "Firma eliminada" });
    } catch (e) {
      console.error("[Beneficiarios] Error al eliminar firma:", e);
      return c.json({ error: "Error al eliminar firma" }, 500);
    }
  }
);

export default app;
