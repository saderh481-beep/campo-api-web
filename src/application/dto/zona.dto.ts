import { z } from "zod";

export const ZonaCreateDto = z.object({
  nombre: z.string().min(2),
  descripcion: z.string().optional(),
});

export const ZonaUpdateDto = z.object({
  nombre: z.string().min(2).optional(),
  descripcion: z.string().optional(),
});

export const ZonaParamsDto = z.object({
  id: z.string().uuid(),
});

export type ZonaCreateDto = z.infer<typeof ZonaCreateDto>;
export type ZonaUpdateDto = z.infer<typeof ZonaUpdateDto>;
export type ZonaParamsDto = z.infer<typeof ZonaParamsDto>;