export const emailConfig = {
  host: process.env.EMAIL_HOST || 'mail.emporiodopet.com.br',
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'newsletter@emporiodopet.com.br',
    pass: process.env.EMAIL_PASSWORD || '',
  },
  from: process.env.EMAIL_FROM || 'Newsletter Emporio do Pet <newsletter@emporiodopet.com.br>',
  // Configurações adicionais para melhor compatibilidade
  tls: {
    rejectUnauthorized: false
  }
};

// Função de validação melhorada
export function validateEmailConfig() {
  const required = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente faltando: ${missing.join(', ')}`);
  }

  if (!emailConfig.auth.pass) {
    throw new Error('EMAIL_PASSWORD não configurada');
  }

  console.log('✅ Configuração de e-mail validada:', {
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    user: emailConfig.auth.user
  });

  return true;
}
