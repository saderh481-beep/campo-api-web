import { z } from "zod";

export const listarBitacorasSchema = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  pageSize:  z.coerce.number().int().min(1).max(100).default(20),
  tecnicoId: z.string().uuid().optional(),
  tipo:      z.enum(["A", "B"]).optional(),
  estado:    z.enum(["borrador", "cerrada"]).optional(),
  mes:       z.string().regex(/^\d{4}-\d{2}$/, "Formato YYYY-MM").optional(),
});

export const actualizarBitacoraSchema = z.object({
  notas: z.string().max(2000).nullable().optional(),
});
