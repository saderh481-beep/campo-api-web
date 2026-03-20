import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
const from = process.env.EMAIL_FROM ?? "no-reply@tucampo.hidalgo.gob.mx";

export async function enviarOtp(correo: string, otp: string): Promise<void> {
  await resend.emails.send({
    from,
    to: correo,
    subject: "Tu código de acceso — Campo Hidalgo",
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:auto">
        <h2>Código de acceso</h2>
        <p>Tu código de un solo uso es:</p>
        <div style="font-size:2rem;font-weight:bold;letter-spacing:0.3em;padding:16px;background:#f4f4f4;border-radius:8px;text-align:center">
          ${otp}
        </div>
        <p style="color:#666;font-size:0.85rem">Válido por 10 minutos. No compartas este código.</p>
      </div>
    `,
  });
}

export async function enviarCodigoAcceso(correo: string, codigoAcceso: string): Promise<void> {
  await enviarOtp(correo, codigoAcceso);
}

export async function enviarCodigoTecnico(
  correo: string,
  nombre: string,
  codigo: string,
  fechaLimite: Date
): Promise<void> {
  await resend.emails.send({
    from,
    to: correo,
    subject: "Tu código de acceso a la app — Campo Hidalgo",
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:auto">
        <h2>Hola, ${nombre}</h2>
        <p>Tu código para iniciar sesión en la app es:</p>
        <div style="font-size:2rem;font-weight:bold;letter-spacing:0.3em;padding:16px;background:#f4f4f4;border-radius:8px;text-align:center">
          ${codigo}
        </div>
        <p style="color:#666;font-size:0.85rem">
          Válido hasta: <strong>${fechaLimite.toLocaleDateString("es-MX")}</strong>.
          No compartas este código.
        </p>
      </div>
    `,
  });
}
