import { z } from "zod";

export const crearActividadSchema = z.object({
  nombre:      z.string().min(2).max(120),
  descripcion: z.string().max(500).optional(),
});

export const actualizarActividadSchema = z.object({
  nombre:      z.string().min(2).max(120).optional(),
  descripcion: z.string().max(500).nullable().optional(),
  activo:      z.boolean().optional(),
});

export const listarActividadesSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  activo:   z.coerce.boolean().optional(),
});
