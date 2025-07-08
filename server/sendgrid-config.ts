import sgMail from '@sendgrid/mail';

export interface SendGridConfig {
  apiKey: string;
  verified: boolean;
}

export function configureSendGrid(): SendGridConfig {
  const apiKey = process.env.SENDGRID_API_KEY || '';
  
  if (!apiKey) {
    console.error('SendGrid API key not found. Please set SENDGRID_API_KEY in Replit secrets.');
    return { apiKey: '', verified: false };
  }

  try {
    sgMail.setApiKey(apiKey);
    console.log('SendGrid configured successfully');
    return { apiKey, verified: true };
  } catch (error) {
    console.error('Failed to configure SendGrid:', error);
    return { apiKey: '', verified: false };
  }
}

export { sgMail };