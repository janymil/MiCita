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
          .business-info { background: #fef3c7; border-radius: 8px; padding: 20px; margin: 25px 0; }
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
    subject: `New Appointment Booking - ${data.serviceName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .client-info { background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .appointment-info { background-color: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          .highlight { color: #dc3545; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🗓️ New Appointment Booking</h2>
            <p>You have received a new appointment booking through your public booking page.</p>
          </div>
          
          <div class="client-info">
            <h3>Client Information</h3>
            <p><strong>Name:</strong> ${data.clientName}</p>
            <p><strong>Email:</strong> ${data.clientEmail}</p>
            <p><strong>Phone:</strong> ${data.clientPhone}</p>
          </div>
          
          <div class="appointment-info">
            <h3>Appointment Details</h3>
            <p><strong>Service:</strong> ${data.serviceName}</p>
            <p><strong>Date:</strong> <span class="highlight">${data.date}</span></p>
            <p><strong>Time:</strong> <span class="highlight">${data.time}</span></p>
            <p><strong>Duration:</strong> ${data.duration} minutes</p>
            <p><strong>Price:</strong> $${data.price}</p>
            ${data.notes ? `<p><strong>Client Notes:</strong> ${data.notes}</p>` : ''}
          </div>
          
          <p><strong>Status:</strong> Pending confirmation</p>
          
          <p>Please log in to your dashboard to confirm or manage this appointment.</p>
          
          <div class="footer">
            <p>This notification was automatically generated from your booking system.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
}