export interface AppointmentData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  businessName: string;
  businessEmail: string;
  serviceName: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  notes?: string;
}

export function getClientConfirmationTemplate(data: AppointmentData): { subject: string; html: string } {
  return {
    subject: `✅ Confirmación de Cita - ${data.businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
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
          .footer { background: #374151; color: white; padding: 25px 30px; text-align: center; font-size: 14px; }
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
            <p style="font-size: 18px; color: #374151;">Hola <strong>${data.clientName}</strong>,</p>
            <p style="color: #6b7280; line-height: 1.6;">
              ¡Excelente! Hemos confirmado tu cita en <strong>${data.businessName}</strong>. 
              Aquí están todos los detalles importantes:
            </p>
            
            <div class="appointment-card">
              <h3 style="margin: 0 0 20px 0; color: #111827; font-size: 20px;">📅 Detalles de tu Cita</h3>
              <div class="detail-row">
                <span class="label">Servicio:</span>
                <span class="value">${data.serviceName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Fecha:</span>
                <span class="value">${data.date}</span>
              </div>
              <div class="detail-row">
                <span class="label">Hora:</span>
                <span class="value">${data.time}</span>
              </div>
              <div class="detail-row">
                <span class="label">Duración:</span>
                <span class="value">${data.duration} minutos</span>
              </div>
              <div class="detail-row">
                <span class="label">Precio:</span>
                <span class="value price">S/ ${data.price}</span>
              </div>
              ${data.notes ? `
              <div class="detail-row">
                <span class="label">Notas:</span>
                <span class="value">${data.notes}</span>
              </div>` : ''}
            </div>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong> Por favor llega 5-10 minutos antes de tu cita. 
              Si necesitas cancelar o reprogramar, contacta directamente al negocio.
            </div>
          </div>
          
          <div class="footer">
            <p style="margin: 0;">Este es un email automático de confirmación.</p>
            <p style="margin: 5px 0 0 0; opacity: 0.8;">MiCita - Sistema de Reservas Online</p>
          </div>
        </div>
      </body>
      </html>`
  };
}

export function getBusinessNotificationTemplate(data: AppointmentData): { subject: string; html: string } {
  return {
    subject: `🔔 Nueva Cita Reservada - ${data.businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
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
            <p style="font-size: 18px; color: #374151;">Hola <strong>${data.businessName}</strong>,</p>
            <p style="color: #6b7280; line-height: 1.6;">
              ¡Tienes una nueva cita! Un cliente ha reservado un servicio a través de tu micrositio web.
            </p>
            
            <div class="appointment-card">
              <h3 style="margin: 0 0 20px 0; color: #111827; font-size: 20px;">📅 Detalles de la Cita</h3>
              <div class="detail-row">
                <span class="label">Servicio:</span>
                <span class="value">${data.serviceName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Fecha:</span>
                <span class="value">${data.date}</span>
              </div>
              <div class="detail-row">
                <span class="label">Hora:</span>
                <span class="value">${data.time}</span>
              </div>
              <div class="detail-row">
                <span class="label">Duración:</span>
                <span class="value">${data.duration} minutos</span>
              </div>
              <div class="detail-row">
                <span class="label">Precio:</span>
                <span class="value price">S/ ${data.price}</span>
              </div>
            </div>
            
            <div class="customer-card">
              <h4 style="margin: 0 0 15px 0; color: #1e40af;">👤 Información del Cliente</h4>
              <div class="detail-row">
                <span class="label">Nombre:</span>
                <span class="value">${data.clientName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Teléfono:</span>
                <span class="value">${data.clientPhone}</span>
              </div>
              <div class="detail-row">
                <span class="label">Email:</span>
                <span class="value">${data.clientEmail}</span>
              </div>
            </div>
            
            ${data.notes ? `<div class="notes">
              <strong>💬 Notas del Cliente:</strong><br>
              "${data.notes}"
            </div>` : ''}
            
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
      </html>`
  };
}

export function getAppointmentCancelledTemplate(data: AppointmentData): { subject: string; html: string } {
  return {
    subject: `❌ Cita Cancelada - ${data.serviceName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .content { padding: 40px 30px; }
          .alert { background: linear-gradient(135deg, #fef2f2, #fee2e2); border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #dc2626; }
          .appointment-details { background: #f3f4f6; border-radius: 12px; padding: 25px; margin: 25px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: 600; color: #374151; }
          .value { color: #111827; font-weight: 500; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Cita Cancelada</h1>
          </div>
          
          <div class="content">
            <div class="alert">
              <p style="color: #dc2626; font-size: 16px; margin: 0;">
                <strong>Lamentamos informarte que tu cita ha sido cancelada por el negocio.</strong>
              </p>
            </div>
            
            <div class="appointment-details">
              <h3 style="color: #374151; margin-bottom: 15px;">Detalles de la Cita Cancelada</h3>
              <div class="detail-row">
                <span class="label">Negocio:</span>
                <span class="value">${data.businessName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Servicio:</span>
                <span class="value">${data.serviceName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Fecha:</span>
                <span class="value">${data.date}</span>
              </div>
              <div class="detail-row">
                <span class="label">Hora:</span>
                <span class="value">${data.time}</span>
              </div>
              <div class="detail-row">
                <span class="label">Duración:</span>
                <span class="value">${data.duration} minutos</span>
              </div>
              <div class="detail-row">
                <span class="label">Precio:</span>
                <span class="value">S/ ${data.price}</span>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                Si tienes alguna pregunta sobre esta cancelación, puedes contactar directamente con el negocio.
              </p>
              <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
                <strong>Contacto:</strong> ${data.businessEmail}
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p style="margin: 0;">Este es un email automático de notificación.</p>
            <p style="margin: 5px 0 0 0; opacity: 0.8;">MiCita - Sistema de Reservas Online</p>
          </div>
        </div>
      </body>
      </html>`
  };
}

export function getAppointmentRescheduledTemplate(data: AppointmentData & { previousDate: string; previousTime: string }): { subject: string; html: string } {
  return {
    subject: `🔄 Cita Reprogramada - ${data.serviceName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #f59e0b, #fbbf24); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .content { padding: 40px 30px; }
          .alert { background: linear-gradient(135deg, #fef7cd, #fef3c7); border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #f59e0b; }
          .old-appointment { background: #f3f4f6; border-radius: 12px; padding: 25px; margin: 25px 0; opacity: 0.7; }
          .new-appointment { background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #0ea5e9; }
          .appointment-details { background: #f3f4f6; border-radius: 12px; padding: 25px; margin: 25px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: 600; color: #374151; }
          .value { color: #111827; font-weight: 500; }
          .new-value { color: #0ea5e9; font-weight: bold; font-size: 18px; }
          .old-value { color: #6b7280; text-decoration: line-through; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Cita Reprogramada</h1>
          </div>
          
          <div class="content">
            <div class="alert">
              <p style="color: #92400e; font-size: 16px; margin: 0;">
                <strong>Tu cita ha sido reprogramada. Por favor, revisa la nueva fecha y hora.</strong>
              </p>
            </div>
            
            <div class="old-appointment">
              <h3 style="color: #374151; margin-bottom: 15px;">Fecha y Hora Anterior</h3>
              <div class="detail-row">
                <span class="label">Fecha:</span>
                <span class="value old-value">${data.previousDate}</span>
              </div>
              <div class="detail-row">
                <span class="label">Hora:</span>
                <span class="value old-value">${data.previousTime}</span>
              </div>
            </div>
            
            <div class="new-appointment">
              <h3 style="color: #0ea5e9; margin-bottom: 15px;">Nueva Fecha y Hora</h3>
              <div class="detail-row">
                <span class="label">Fecha:</span>
                <span class="value new-value">${data.date}</span>
              </div>
              <div class="detail-row">
                <span class="label">Hora:</span>
                <span class="value new-value">${data.time}</span>
              </div>
            </div>
            
            <div class="appointment-details">
              <h3 style="color: #374151; margin-bottom: 15px;">Detalles de la Cita</h3>
              <div class="detail-row">
                <span class="label">Negocio:</span>
                <span class="value">${data.businessName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Servicio:</span>
                <span class="value">${data.serviceName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Duración:</span>
                <span class="value">${data.duration} minutos</span>
              </div>
              <div class="detail-row">
                <span class="label">Precio:</span>
                <span class="value">S/ ${data.price}</span>
              </div>
              ${data.notes ? `<div class="detail-row">
                <span class="label">Notas:</span>
                <span class="value">${data.notes}</span>
              </div>` : ''}
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                Si tienes alguna pregunta sobre esta reprogramación, puedes contactar directamente con el negocio.
              </p>
              <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
                <strong>Contacto:</strong> ${data.businessEmail}
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p style="margin: 0;">Este es un email automático de notificación.</p>
            <p style="margin: 5px 0 0 0; opacity: 0.8;">MiCita - Sistema de Reservas Online</p>
          </div>
        </div>
      </body>
      </html>`
  };
}
// ---------------------------------------------------------------------------
// Microsite contact lead notification
// ---------------------------------------------------------------------------

export interface ContactMessageData {
  businessName: string;
  businessEmail: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  message: string;
  receivedAt?: string;
}

export function getContactMessageTemplate(data: ContactMessageData): { subject: string; html: string } {
  const safe = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const when = data.receivedAt || new Date().toLocaleString("es-PE", { timeZone: "America/Lima" });

  return {
    subject: `📩 Nuevo mensaje desde tu micrositio — ${data.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; background:#f6f2ea; padding:24px;">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eadfd0;">
          <div style="background:linear-gradient(135deg,#c13a2e,#e08b2d);padding:24px;color:#fff;">
            <h1 style="margin:0;font-size:20px;">Nuevo mensaje de contacto</h1>
            <p style="margin:8px 0 0;opacity:.9;font-size:14px;">${safe(data.businessName)} · ${safe(when)}</p>
          </div>
          <div style="padding:24px;color:#2b2b2b;font-size:15px;line-height:1.6;">
            <p style="margin:0 0 12px;"><strong>Nombre:</strong> ${safe(data.name)}</p>
            ${data.email ? `<p style="margin:0 0 12px;"><strong>Email:</strong> ${safe(data.email)}</p>` : ""}
            ${data.phone ? `<p style="margin:0 0 12px;"><strong>Teléfono:</strong> ${safe(data.phone)}</p>` : ""}
            <div style="margin-top:16px;padding:16px;background:#f9f6f1;border-left:4px solid #c13a2e;border-radius:8px;">
              ${safe(data.message).replace(/\n/g, "<br>")}
            </div>
            <p style="margin-top:24px;font-size:13px;color:#6b6b6b;">
              Responde directamente a este correo para contactar al cliente. El mensaje también queda
              guardado en tu panel: Dashboard → Mensajes.
            </p>
          </div>
        </div>
      </div>
    `,
  };
}

// ---------------------------------------------------------------------------
// Appointment reminder (T-24h)
// ---------------------------------------------------------------------------

export function getAppointmentReminderTemplate(
  data: AppointmentData & { cancelUrl?: string },
): { subject: string; html: string } {
  const cancel = data.cancelUrl
    ? `<p style="margin-top:20px;"><a href="${data.cancelUrl}" style="display:inline-block;padding:12px 20px;background:#c13a2e;color:#fff;border-radius:10px;text-decoration:none;">Cancelar o reprogramar</a></p>`
    : "";

  return {
    subject: `⏰ Recordatorio: ${data.serviceName} mañana a las ${data.time}`,
    html: `
      <div style="font-family: Arial, sans-serif; background:#f6f2ea; padding:24px;">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eadfd0;">
          <div style="background:linear-gradient(135deg,#c13a2e,#e08b2d);padding:24px;color:#fff;">
            <h1 style="margin:0;font-size:20px;">Tu cita es mañana</h1>
            <p style="margin:8px 0 0;opacity:.9;font-size:14px;">${data.businessName}</p>
          </div>
          <div style="padding:24px;color:#2b2b2b;font-size:15px;line-height:1.6;">
            <p>Hola <strong>${data.clientName}</strong>, te recordamos tu cita:</p>
            <ul style="padding-left:18px;">
              <li><strong>Servicio:</strong> ${data.serviceName}</li>
              <li><strong>Fecha:</strong> ${data.date}</li>
              <li><strong>Hora:</strong> ${data.time}</li>
              <li><strong>Duración:</strong> ${data.duration} minutos</li>
            </ul>
            ${cancel}
            <p style="margin-top:24px;font-size:13px;color:#6b6b6b;">
              Si no puedes asistir, avísanos con anticipación para liberar el horario.
            </p>
          </div>
        </div>
      </div>
    `,
  };
}

