import { z } from "zod";

export const crearTecnicoSchema = z.object({
  nombre:        z.string().min(2).max(120),
  coordinadorId: z.string().uuid(),
  fechaLimite:   z.string().date("Formato YYYY-MM-DD requerido"),
});

export const actualizarTecnicoSchema = z.object({
  nombre:      z.string().min(2).max(120).optional(),
  fechaLimite: z.string().date().optional(),
  activo:      z.boolean().optional(),
});

export const listarTecnicosSchema = z.object({
  page:          z.coerce.number().int().min(1).default(1),
  pageSize:      z.coerce.number().int().min(1).max(100).default(20),
  coordinadorId: z.string().uuid().optional(),
  activo:        z.coerce.boolean().optional(),
  q:             z.string().optional(),
});
