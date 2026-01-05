export default () => ({
  // Servidor
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  database: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB ?? '0', 10),
  },

  // JWT/Auth
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // NextAuth (compatibilidade)
  nextAuth: {
    secret: process.env.NEXTAUTH_SECRET,
  },

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Email
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT ?? '587', 10),
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@emporiodopet.com',
  },

  // Integrações
  integrations: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    botConversa: {
      apiKey: process.env.BOT_CONVERSA_API_KEY,
      webhookSecret: process.env.BOT_CONVERSA_WEBHOOK_SECRET,
    },
  },
});

