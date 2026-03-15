import { z } from "zod";

export const crearCadenaSchema = z.object({
  nombre: z.string().min(2).max(100),
});

export const actualizarCadenaSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  activo: z.boolean().optional(),
});

export const listarCadenasSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  activo:   z.coerce.boolean().optional(),
});
