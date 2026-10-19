import { sendMail } from "./email-transport.js";

const BRAND = "MiCita";
const ACCENT = "#dc2626";

function layout(title: string, contentHtml: string): string {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:${ACCENT};padding:20px 28px;">
                <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:.5px;">${BRAND}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;color:#18181b;font-size:15px;line-height:1.6;">
                <h1 style="margin:0 0 16px;font-size:19px;color:#18181b;">${title}</h1>
                ${contentHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#fafafa;color:#71717a;font-size:12px;">
                Este mensaje fue enviado automáticamente por ${BRAND}. Si no solicitaste esta acción, ignóralo.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendOtpEmail(email: string, code: string, ttlMinutes: number): Promise<boolean> {
  const html = layout(
    "Tu código de verificación",
    `<p style="margin:0 0 18px;">Usa el siguiente código para continuar:</p>
     <div style="font-size:34px;font-weight:700;letter-spacing:8px;color:${ACCENT};padding:14px 0;text-align:center;">${code}</div>
     <p style="margin:0;color:#52525b;">El código vence en ${ttlMinutes} minutos y solo puede usarse una vez.</p>`,
  );
  return sendMail({
    to: email,
    subject: `${BRAND}: código de verificación ${code}`,
    html,
    text: `Tu código de verificación de ${BRAND} es ${code}. Vence en ${ttlMinutes} minutos.`,
  });
}

export async function sendPasswordResetEmail(email: string, resetUrl: string, ttlMinutes: number): Promise<boolean> {
  const html = layout(
    "Restablece tu contraseña",
    `<p style="margin:0 0 18px;">Recibimos una solicitud para restablecer tu contraseña.</p>
     <p style="margin:0 0 22px;text-align:center;">
       <a href="${resetUrl}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:8px;font-weight:600;">Restablecer contraseña</a>
     </p>
     <p style="margin:0;color:#52525b;">Este enlace vence en ${ttlMinutes} minutos. Si no lo solicitaste, puedes ignorar este correo.</p>
     <p style="margin:14px 0 0;color:#a1a1aa;font-size:12px;word-break:break-all;">${resetUrl}</p>`,
  );
  return sendMail({
    to: email,
    subject: `${BRAND}: restablece tu contraseña`,
    html,
    text: `Restablece tu contraseña de ${BRAND}: ${resetUrl} (vence en ${ttlMinutes} minutos).`,
  });
}

export async function sendEmailVerificationEmail(email: string, verifyUrl: string): Promise<boolean> {
  const html = layout(
    "Verifica tu correo electrónico",
    `<p style="margin:0 0 18px;">Confirma tu dirección de correo para activar todas las funciones de tu cuenta.</p>
     <p style="margin:0 0 22px;text-align:center;">
       <a href="${verifyUrl}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:8px;font-weight:600;">Verificar correo</a>
     </p>`,
  );
  return sendMail({
    to: email,
    subject: `${BRAND}: verifica tu correo electrónico`,
    html,
    text: `Verifica tu correo de ${BRAND}: ${verifyUrl}`,
  });
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  const html = layout(
    `¡Bienvenido a ${BRAND}, ${name}!`,
    `<p style="margin:0 0 14px;">Tu cuenta está lista. Ya puedes crear tu negocio, publicar servicios y recibir reservas en línea.</p>
     <p style="margin:0;color:#52525b;">Ingresa a tu panel para configurar tu micrositio y empezar a recibir clientes.</p>`,
  );
  return sendMail({
    to: email,
    subject: `Bienvenido a ${BRAND}`,
    html,
    text: `¡Bienvenido a ${BRAND}, ${name}! Tu cuenta está lista.`,
  });
}
