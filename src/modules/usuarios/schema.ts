import { z } from "zod";

export const crearUsuarioSchema = z.object({
  nombre:        z.string().min(2).max(120),
  correo:        z.string().email(),
  rol:           z.enum(["admin", "coordinador"]),
  coordinadorId: z.string().uuid().optional(), // solo si rol=coordinador
});

export const actualizarUsuarioSchema = crearUsuarioSchema.partial().omit({ correo: true });

export const listarUsuariosSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  rol:      z.enum(["admin", "coordinador"]).optional(),
  activo:   z.coerce.boolean().optional(),
  q:        z.string().optional(), // búsqueda por nombre/correo
});
