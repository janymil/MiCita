import nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export function getEmailConfig(): EmailConfig {
  return {
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || ''
  };
}

export function createTransporter() {
  const config = getEmailConfig();
  
  if (!config.user || !config.pass) {
    throw new Error('Email configuration is missing. Please set EMAIL_USER and EMAIL_PASS in Replit secrets.');
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
}