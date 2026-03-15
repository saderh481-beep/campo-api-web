import { z } from "zod";

export const solicitarOtpSchema = z.object({
  correo: z.string().email("Correo inválido"),
});

export const loginSchema = z.object({
  correo: z.string().email(),
  otp:    z.string().length(6, "El OTP debe tener 6 dígitos"),
});
