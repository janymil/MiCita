import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SendGrid API key not found. Email functionality will be disabled.");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
  console.log("SendGrid configured successfully");
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("SendGrid API key not configured. Skipping email send.");
    return false;
  }

  try {
    await mailService.send({
      to: params.to,
      from: params.from ?? process.env.EMAIL_FROM ?? 'no-reply@micita.app',
      subject: params.subject,
      text: params.text ?? '',
      html: params.html,
    });
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error: any) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

// Email templates
export function getAppointmentConfirmationEmail(
  customerName: string,
  businessName: string,
  serviceName: string,
  appointmentDate: string,
  appointmentTime: string,
  duration: number,
  price: string,
  businessPhone: string,
  businessAddress: string
) {
  const subject = `✅ Confirmación de Cita - ${businessName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Confirmación de Cita</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #dc2626, #991b1b); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
        .content { padding: 40px 30px; }
        .appointment-card { background: linear-gradient(135deg, #f3f4f6, #e5e7eb); border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #dc2626; }
        .detail-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .label { font-weight: 600; color: #374151; }
        .value { color: #111827; font-weight: 500; }
        .price { color: #dc2626; font-size: 18px; font-weight: bold; }
        .business-info { background: #fef3c7; border-radius: 8px; padding: 20px; margin: 25px 0; }
        .footer { background: #374151; color: white; padding: 25px 30px; text-align: center; font-size: 14px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 15px 0; }
        .warning { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 20px 0; color: #991b1b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>¡Cita Confirmada!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Tu cita ha sido registrada exitosamente</p>
        </div>
        
        <div class="content">
          <p style="font-size: 18px; color: #374151;">Hola <strong>${customerName}</strong>,</p>
          <p style="color: #6b7280; line-height: 1.6;">
            ¡Excelente! Hemos confirmado tu cita en <strong>${businessName}</strong>. 
            Aquí están todos los detalles importantes:
          </p>
          
          <div class="appointment-card">
            <h3 style="margin: 0 0 20px 0; color: #111827; font-size: 20px;">📅 Detalles de tu Cita</h3>
            <div class="detail-row">
              <span class="label">Servicio:</span>
              <span class="value">${serviceName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Fecha:</span>
              <span class="value">${appointmentDate}</span>
            </div>
            <div class="detail-row">
              <span class="label">Hora:</span>
              <span class="value">${appointmentTime}</span>
            </div>
            <div class="detail-row">
              <span class="label">Duración:</span>
              <span class="value">${duration} minutos</span>
            </div>
            <div class="detail-row">
              <span class="label">Precio:</span>
              <span class="value price">S/ ${price}</span>
            </div>
          </div>
          
          <div class="business-info">
            <h4 style="margin: 0 0 15px 0; color: #92400e;">📍 Información del Negocio</h4>
            <p style="margin: 5px 0;"><strong>${businessName}</strong></p>
            <p style="margin: 5px 0; color: #78716c;">📍 ${businessAddress}</p>
            <p style="margin: 5px 0; color: #78716c;">📞 ${businessPhone}</p>
          </div>
          
          <div class="warning">
            <strong>⚠️ Importante:</strong> Por favor llega 5-10 minutos antes de tu cita. 
            Si necesitas cancelar o reprogramar, contacta directamente al negocio.
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="tel:${businessPhone}" class="btn">Llamar al Negocio</a>
          </div>
        </div>
        
        <div class="footer">
          <p style="margin: 0;">Este es un email automático de confirmación.</p>
          <p style="margin: 5px 0 0 0; opacity: 0.8;">MiCita - Sistema de Reservas Online</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
¡Hola ${customerName}!

Tu cita ha sido confirmada en ${businessName}:

📅 DETALLES DE TU CITA:
• Servicio: ${serviceName}
• Fecha: ${appointmentDate}
• Hora: ${appointmentTime}
• Duración: ${duration} minutos
• Precio: S/ ${price}

📍 INFORMACIÓN DEL NEGOCIO:
${businessName}
${businessAddress}
Teléfono: ${businessPhone}

⚠️ IMPORTANTE: 
Por favor llega 5-10 minutos antes de tu cita.
Si necesitas cancelar o reprogramar, contacta directamente al negocio.

---
Este es un email automático de confirmación.
MiCita - Sistema de Reservas Online
  `;

  return { subject, html, text };
}

export function getBusinessNotificationEmail(
  businessName: string,
  customerName: string,
  customerPhone: string,
  customerEmail: string,
  serviceName: string,
  appointmentDate: string,
  appointmentTime: string,
  duration: number,
  price: string,
  customerNotes?: string
) {
  const subject = `🔔 Nueva Cita Reservada - ${businessName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Nueva Cita Reservada</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #1f2937, #374151); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
        .content { padding: 40px 30px; }
        .appointment-card { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #10b981; }
        .customer-card { background: linear-gradient(135deg, #eff6ff, #dbeafe); border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #3b82f6; }
        .detail-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .label { font-weight: 600; color: #374151; }
        .value { color: #111827; font-weight: 500; }
        .price { color: #059669; font-size: 18px; font-weight: bold; }
        .footer { background: #374151; color: white; padding: 25px 30px; text-align: center; font-size: 14px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 15px 10px; }
        .notes { background: #fef3c7; border-radius: 8px; padding: 15px; margin: 15px 0; font-style: italic; color: #92400e; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 Nueva Cita Reservada</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Un cliente ha reservado una cita online</p>
        </div>
        
        <div class="content">
          <p style="font-size: 18px; color: #374151;">Hola <strong>${businessName}</strong>,</p>
          <p style="color: #6b7280; line-height: 1.6;">
            ¡Tienes una nueva cita! Un cliente ha reservado un servicio a través de tu micrositio web.
          </p>
          
          <div class="appointment-card">
            <h3 style="margin: 0 0 20px 0; color: #111827; font-size: 20px;">📅 Detalles de la Cita</h3>
            <div class="detail-row">
              <span class="label">Servicio:</span>
              <span class="value">${serviceName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Fecha:</span>
              <span class="value">${appointmentDate}</span>
            </div>
            <div class="detail-row">
              <span class="label">Hora:</span>
              <span class="value">${appointmentTime}</span>
            </div>
            <div class="detail-row">
              <span class="label">Duración:</span>
              <span class="value">${duration} minutos</span>
            </div>
            <div class="detail-row">
              <span class="label">Precio:</span>
              <span class="value price">S/ ${price}</span>
            </div>
          </div>
          
          <div class="customer-card">
            <h4 style="margin: 0 0 15px 0; color: #1e40af;">👤 Información del Cliente</h4>
            <div class="detail-row">
              <span class="label">Nombre:</span>
              <span class="value">${customerName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Teléfono:</span>
              <span class="value">${customerPhone}</span>
            </div>
            <div class="detail-row">
              <span class="label">Email:</span>
              <span class="value">${customerEmail}</span>
            </div>
          </div>
          
          ${customerNotes ? `<div class="notes">
            <strong>💬 Notas del Cliente:</strong><br>
            "${customerNotes}"
          </div>` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="tel:${customerPhone}" class="btn">Llamar Cliente</a>
            <a href="mailto:${customerEmail}" class="btn">Enviar Email</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 30px 0;">
            💡 Recuerda confirmar la cita con el cliente y estar preparado para brindar un excelente servicio.
          </p>
        </div>
        
        <div class="footer">
          <p style="margin: 0;">Notificación automática de MiCita</p>
          <p style="margin: 5px 0 0 0; opacity: 0.8;">Sistema de Gestión de Citas</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
¡Nueva Cita Reservada en ${businessName}!

📅 DETALLES DE LA CITA:
• Servicio: ${serviceName}
• Fecha: ${appointmentDate}
• Hora: ${appointmentTime}
• Duración: ${duration} minutos
• Precio: S/ ${price}

👤 INFORMACIÓN DEL CLIENTE:
• Nombre: ${customerName}
• Teléfono: ${customerPhone}
• Email: ${customerEmail}

${customerNotes ? `💬 NOTAS DEL CLIENTE:\n"${customerNotes}"\n` : ''}

💡 Recuerda confirmar la cita con el cliente y estar preparado para brindar un excelente servicio.

---
Notificación automática de MiCita
Sistema de Gestión de Citas
  `;

  return { subject, html, text };
}