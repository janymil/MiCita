import { createTransporter } from './email-config';
import { getClientConfirmationTemplate, getBusinessNotificationTemplate, AppointmentData } from './email-templates';

export class EmailService {
  private transporter;

  constructor() {
    try {
      this.transporter = createTransporter();
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to create email transporter:', error);
      console.error('Please ensure EMAIL_USER and EMAIL_PASS are set in Replit secrets');
      this.transporter = null;
    }
  }

  async sendClientConfirmation(appointmentData: AppointmentData): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email service not configured. Skipping client confirmation email.');
      return false;
    }

    try {
      const template = getClientConfirmationTemplate(appointmentData);
      
      await this.transporter.sendMail({
        from: `"${appointmentData.businessName}" <${process.env.EMAIL_USER}>`,
        replyTo: appointmentData.businessEmail,
        to: appointmentData.clientEmail,
        subject: template.subject,
        html: template.html
      });

      console.log(`Client confirmation email sent to: ${appointmentData.clientEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send client confirmation email:', error);
      return false;
    }
  }

  async sendBusinessNotification(appointmentData: AppointmentData): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email service not configured. Skipping business notification email.');
      return false;
    }

    try {
      const template = getBusinessNotificationTemplate(appointmentData);
      
      await this.transporter.sendMail({
        from: `"Sistema de Reservas" <${process.env.EMAIL_USER}>`,
        replyTo: appointmentData.clientEmail,
        to: appointmentData.businessEmail,
        subject: template.subject,
        html: template.html
      });

      console.log(`Business notification email sent to: ${appointmentData.businessEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send business notification email:', error);
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
export const emailService = new EmailService();