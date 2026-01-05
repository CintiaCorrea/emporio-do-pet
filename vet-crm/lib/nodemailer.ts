// lib/nodemailer.ts
import nodemailer from 'nodemailer';

// Tipos para configuração
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Configuração padrão (Mailtrap para desenvolvimento)
const defaultConfig: EmailConfig = {
  host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(config: EmailConfig = defaultConfig) {
    // CORREÇÃO: usar createTransport em vez de createTransporter
    this.transporter = nodemailer.createTransport(config);
  }

  // Verificar conexão
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Servidor de email pronto para enviar mensagens');
      return true;
    } catch (error) {
      console.error('❌ Erro na conexão com servidor de email:', error);
      return false;
    }
  }

  // Enviar email individual
  async sendEmail(options: EmailOptions): Promise<SendEmailResult> {
    try {
      const mailOptions = {
        from: options.from || '"Empório do Pet" <noreply@emporiodopet.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
        cc: options.cc,
        bcc: options.bcc,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`📧 Email enviado: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  // Enviar para múltiplos destinatários
  async sendBulkEmails(
    emails: string[], 
    subject: string, 
    html: string
  ): Promise<{ success: number; failures: Array<{ email: string; error: string }> }> {
    const failures: Array<{ email: string; error: string }> = [];
    let success = 0;

    for (const email of emails) {
      const result = await this.sendEmail({
        to: email,
        subject,
        html,
      });

      if (result.success) {
        success++;
      } else {
        failures.push({ email, error: result.error || 'Erro desconhecido' });
      }

      // Pequeno delay para evitar spam detection
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { success, failures };
  }

  // Converter HTML para texto simples (fallback)
  private htmlToText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  // Templates pré-definidos
  templates = {
    welcome: (name: string, activationLink?: string) => ({
      subject: `Bem-vindo ao Empório do Pet, ${name}! 🐾`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Bem-vindo ao Empório do Pet!</h2>
          <p>Olá <strong>${name}</strong>,</p>
          <p>Estamos muito felizes em ter você conosco! No Empório do Pet, você encontra tudo que precisa para seu pet com a melhor qualidade.</p>
          ${activationLink ? `
            <p style="text-align: center; margin: 30px 0;">
              <a href="${activationLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Ativar Minha Conta
              </a>
            </p>
          ` : ''}
          <p>Qualquer dúvida, estamos à disposição!</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          <p style="color: #666; font-size: 14px;">
            Atenciosamente,<br>
            <strong>Equipe Empório do Pet</strong>
          </p>
        </div>
      `,
    }),

    newsletter: (title: string, content: string, unsubscribeLink: string) => ({
      subject: `📰 ${title} - Empório do Pet`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #4F46E5, #7E22CE); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">🐾 Empório do Pet</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${title}</p>
          </div>
          
          <div style="padding: 20px;">
            ${content}
          </div>

          <div style="background-color: #f8fafc; padding: 20px; text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              Você está recebendo este email porque se inscreveu na newsletter do Empório do Pet.<br>
              <a href="${unsubscribeLink}" style="color: #4F46E5;">Cancelar inscrição</a>
            </p>
          </div>
        </div>
      `,
    }),

    passwordReset: (name: string, resetLink: string) => ({
      subject: '🔐 Redefinição de Senha - Empório do Pet',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Redefinir Senha</h2>
          <p>Olá <strong>${name}</strong>,</p>
          <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:</p>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Redefinir Minha Senha
            </a>
          </p>

          <p style="color: #666; font-size: 14px;">
            <strong>Importante:</strong> Este link expira em 1 hora. Se você não solicitou esta redefinição, ignore este email.
          </p>

          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          <p style="color: #666; font-size: 14px;">
            Atenciosamente,<br>
            <strong>Equipe Empório do Pet</strong>
          </p>
        </div>
      `,
    }),
  };
}

// Instância global do serviço de email
export const emailService = new EmailService();

export default emailService;
