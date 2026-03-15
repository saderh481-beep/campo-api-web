import { z } from "zod";

export const crearBeneficiarioSchema = z.object({
  tecnicoId:  z.string().uuid(),
  nombre:     z.string().min(2).max(200),
  curp:       z.string().length(18).optional(),
  telefono:   z.string().max(15).optional(),
  municipio:  z.string().max(100).optional(),
  localidad:  z.string().max(100).optional(),
  cadenas:    z.array(z.string().uuid()).min(1, "Al menos una cadena productiva"),
});

export const actualizarBeneficiarioSchema = z.object({
  nombre:    z.string().min(2).max(200).optional(),
  curp:      z.string().length(18).nullable().optional(),
  telefono:  z.string().max(15).nullable().optional(),
  municipio: z.string().max(100).nullable().optional(),
  localidad: z.string().max(100).nullable().optional(),
  activo:    z.boolean().optional(),
});

export const listarBeneficiariosSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  tecnicoId:z.string().uuid().optional(),
  q:        z.string().optional(), // búsqueda fonética
  activo:   z.coerce.boolean().optional(),
});
