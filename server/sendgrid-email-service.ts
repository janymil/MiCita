import { configureSendGrid, sgMail } from './sendgrid-config';
import { getClientConfirmationTemplate, getBusinessNotificationTemplate, AppointmentData } from './email-templates';

export class SendGridEmailService {
  private isConfigured: boolean;

  constructor() {
    const config = configureSendGrid();
    this.isConfigured = config.verified;
  }

  async sendClientConfirmation(appointmentData: AppointmentData): Promise<boolean> {
    if (!this.isConfigured) {
      console.error('SendGrid not configured. Skipping client confirmation email.');
      return false;
    }

    try {
      const template = getClientConfirmationTemplate(appointmentData);
      
      const msg = {
        to: appointmentData.clientEmail,
        from: {
          email: process.env.SENDGRID_VERIFIED_SENDER || 'noreply@yourdomain.com',
          name: appointmentData.businessName
        },
        replyTo: appointmentData.businessEmail,
        subject: template.subject,
        html: template.html,
      };

      await sgMail.send(msg);
      console.log(`Client confirmation email sent to: ${appointmentData.clientEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send client confirmation email:', error);
      if (error.response) {
        console.error('SendGrid Error:', error.response.body);
      }
      return false;
    }
  }

  async sendBusinessNotification(appointmentData: AppointmentData): Promise<boolean> {
    if (!this.isConfigured) {
      console.error('SendGrid not configured. Skipping business notification email.');
      return false;
    }

    try {
      const template = getBusinessNotificationTemplate(appointmentData);
      
      const msg = {
        to: appointmentData.businessEmail,
        from: {
          email: process.env.SENDGRID_VERIFIED_SENDER || 'noreply@yourdomain.com',
          name: 'Sistema de Reservas'
        },
        replyTo: appointmentData.clientEmail,
        subject: template.subject,
        html: template.html,
      };

      await sgMail.send(msg);
      console.log(`Business notification email sent to: ${appointmentData.businessEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send business notification email:', error);
      if (error.response) {
        console.error('SendGrid Error:', error.response.body);
      }
      return false;
    }
  }

  async sendAppointmentEmails(appointmentData: AppointmentData): Promise<{ clientSent: boolean; businessSent: boolean }> {
    const [clientSent, businessSent] = await Promise.all([
      this.sendClientConfirmation(appointmentData),
      this.sendBusinessNotification(appointmentData)
    ]);

    return { clientSent, businessSent };
  }
}

// Export a singleton instance
export const sendGridEmailService = new SendGridEmailService();