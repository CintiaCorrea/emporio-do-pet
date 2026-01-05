import nodemailer from 'nodemailer';
import { emailConfig } from './email-config';

const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  auth: {
    user: emailConfig.auth.user,
    pass: emailConfig.auth.pass,
  },
});

// Verificar conexão
transporter.verify((error) => {
  if (error) {
    console.error('Erro na configuração do e-mail:', error);
  } else {
    console.log('Servidor de e-mail configurado com sucesso');
  }
});

export interface EmailData {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export async function sendEmail({ 
  to, 
  subject, 
  html, 
  text, 
  cc, 
  bcc 
}: EmailData) {
  try {
    const mailOptions = {
      from: emailConfig.from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
      cc,
      bcc,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('E-mail enviado com sucesso:', result.messageId);
    
    return { 
      success: true, 
      messageId: result.messageId,
      response: result.response 
    };
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}
