import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private defaultFrom: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const resendKey = this.configService.get<string>('RESEND_API_KEY');
    const host = resendKey ? 'smtp.resend.com' : (this.configService.get<string>('EMAIL_HOST') || 'mail.emporiodopet.com.br');
    const port = resendKey ? 465 : parseInt(this.configService.get<string>('EMAIL_PORT') || '465', 10);
    const secure = this.configService.get<string>('EMAIL_SECURE') !== 'false';
    const user = resendKey ? 'resend' : this.configService.get<string>('EMAIL_USER');
    const pass = resendKey || this.configService.get<string>('EMAIL_PASSWORD');

    this.defaultFrom = this.configService.get<string>('EMAIL_FROM') || 
      'Empório do Pet <contato@emporiodopet.com.br>';

    if (!user || !pass) {
      this.logger.warn('Email credentials not configured. Email sending will be disabled.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: {
          rejectUnauthorized: false,
        },
      });

      this.logger.log(`Email service initialized: ${host}:${port}`);
    } catch (error) {
      this.logger.error('Failed to initialize email transporter:', error);
    }
  }

  // Get email config from user's integration settings
  async getUserEmailConfig(userId: string): Promise<EmailConfig | null> {
    try {
      const settings = await this.prisma.integrationSettings.findFirst({
        where: { userId },
        select: { emailConfig: true },
      });

      if (!settings?.emailConfig) {
        return null;
      }

      return JSON.parse(settings.emailConfig as string);
    } catch (error) {
      this.logger.error(`Error getting email config for user ${userId}:`, error);
      return null;
    }
  }

  // Create transporter from custom config
  private createTransporter(config: EmailConfig): nodemailer.Transporter {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  // Send a single email
  async sendEmail(
    message: EmailMessage,
    config?: EmailConfig,
  ): Promise<EmailResponse> {
    const transporter = config 
      ? this.createTransporter(config) 
      : this.transporter;

    if (!transporter) {
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    const from = config?.from || this.defaultFrom;

    try {
      const recipients = Array.isArray(message.to) ? message.to.join(', ') : message.to;
      
      this.logger.debug(`Sending email to ${recipients}: ${message.subject}`);

      const info = await transporter.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        cc: message.cc,
        bcc: message.bcc,
        replyTo: message.replyTo,
        attachments: message.attachments,
      });

      this.logger.log(`Email sent to ${recipients}, messageId: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error sending email: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Send emails to multiple recipients (individually)
  async sendBulkEmails(
    messages: EmailMessage[],
    config?: EmailConfig,
    delayMs: number = 100,
  ): Promise<{ sent: number; failed: number; results: EmailResponse[] }> {
    const results: EmailResponse[] = [];
    let sent = 0;
    let failed = 0;

    for (const message of messages) {
      const result = await this.sendEmail(message, config);
      results.push(result);

      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      // Rate limiting delay
      if (delayMs > 0 && messages.indexOf(message) < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    this.logger.log(`Bulk emails: ${sent} sent, ${failed} failed`);

    return { sent, failed, results };
  }

  // Check if email service is configured
  isConfigured(): boolean {
    return this.transporter !== null;
  }

  // Test email connection
  async testConnection(config?: EmailConfig): Promise<{ connected: boolean; error?: string }> {
    const transporter = config 
      ? this.createTransporter(config) 
      : this.transporter;

    if (!transporter) {
      return { connected: false, error: 'Email service not configured' };
    }

    try {
      await transporter.verify();
      return { connected: true };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Email templates
  getTemplates() {
    return {
      appointmentReminder: (params: {
        tutorName: string;
        petName: string;
        date: string;
        time: string;
        clinicName: string;
        clinicPhone?: string;
      }) => ({
        subject: `Lembrete: Consulta de ${params.petName} amanhã`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .highlight { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed; }
              .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin:0;">Lembrete de Consulta</h1>
              </div>
              <div class="content">
                <p>Olá, <strong>${params.tutorName}</strong>!</p>
                <p>Este é um lembrete amigável sobre a consulta agendada para <strong>${params.petName}</strong>.</p>
                
                <div class="highlight">
                  <p><strong>Data:</strong> ${params.date}</p>
                  <p><strong>Horário:</strong> ${params.time}</p>
                  <p><strong>Local:</strong> ${params.clinicName}</p>
                </div>
                
                <p>Por favor, chegue com 10 minutos de antecedência.</p>
                
                ${params.clinicPhone ? `<p>Precisa reagendar? Entre em contato: <strong>${params.clinicPhone}</strong></p>` : ''}
                
                <p>Atenciosamente,<br><strong>${params.clinicName}</strong></p>
              </div>
              <div class="footer">
                <p>Este é um e-mail automático. Por favor, não responda.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Olá, ${params.tutorName}!

Este é um lembrete sobre a consulta agendada para ${params.petName}.

Data: ${params.date}
Horário: ${params.time}
Local: ${params.clinicName}

Por favor, chegue com 10 minutos de antecedência.

${params.clinicPhone ? `Precisa reagendar? Entre em contato: ${params.clinicPhone}` : ''}

Atenciosamente,
${params.clinicName}
        `.trim(),
      }),

      welcomeTutor: (params: {
        tutorName: string;
        clinicName: string;
        loginUrl?: string;
      }) => ({
        subject: `Bem-vindo(a) ao ${params.clinicName}!`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .btn { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
              .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin:0;">Bem-vindo(a)!</h1>
              </div>
              <div class="content">
                <p>Olá, <strong>${params.tutorName}</strong>!</p>
                <p>É um prazer tê-lo(a) como cliente do <strong>${params.clinicName}</strong>!</p>
                <p>Estamos aqui para cuidar do seu pet com todo carinho e dedicação.</p>
                
                ${params.loginUrl ? `
                <p style="text-align: center;">
                  <a href="${params.loginUrl}" class="btn">Acessar Portal do Cliente</a>
                </p>
                ` : ''}
                
                <p>Se tiver alguma dúvida, não hesite em entrar em contato conosco.</p>
                
                <p>Atenciosamente,<br><strong>Equipe ${params.clinicName}</strong></p>
              </div>
              <div class="footer">
                <p>Este é um e-mail automático. Por favor, não responda.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Olá, ${params.tutorName}!

É um prazer tê-lo(a) como cliente do ${params.clinicName}!

Estamos aqui para cuidar do seu pet com todo carinho e dedicação.

${params.loginUrl ? `Acesse o portal do cliente: ${params.loginUrl}` : ''}

Se tiver alguma dúvida, não hesite em entrar em contato conosco.

Atenciosamente,
Equipe ${params.clinicName}
        `.trim(),
      }),

      notification: (params: {
        title: string;
        message: string;
        recipientName: string;
        actionUrl?: string;
        actionText?: string;
      }) => ({
        subject: params.title,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4f46e5; color: white; padding: 20px 30px; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .btn { display: inline-block; background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin:0;">${params.title}</h2>
              </div>
              <div class="content">
                <p>Olá, <strong>${params.recipientName}</strong>!</p>
                <p>${params.message}</p>
                
                ${params.actionUrl && params.actionText ? `
                <p style="text-align: center;">
                  <a href="${params.actionUrl}" class="btn">${params.actionText}</a>
                </p>
                ` : ''}
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Olá, ${params.recipientName}!

${params.message}

${params.actionUrl ? `${params.actionText}: ${params.actionUrl}` : ''}
        `.trim(),
      }),
    };
  }
}
