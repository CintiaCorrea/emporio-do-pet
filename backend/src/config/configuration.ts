export default () => ({
  // Servidor
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  database: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },

  // Redis - Suporta REDIS_URL (Upstash/Fly.io) ou variáveis separadas
  redis: {
    url: process.env.REDIS_URL || undefined,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB ?? '0', 10),
    tls: process.env.REDIS_TLS === 'true' || process.env.REDIS_URL?.startsWith('rediss://'),
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

  // Integrações AI
  integrations: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
    },
  },

  // WhatsApp Business API (Meta Cloud API)
  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    appSecret: process.env.WHATSAPP_APP_SECRET,
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
    defaultAgentId: process.env.WHATSAPP_DEFAULT_AGENT_ID || null,
  },

  // AI Service (FastAPI)
  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  },

  // TTS Audio Cache
  ttsCache: {
    enabled: process.env.TTS_CACHE_ENABLED !== 'false',
    ttlSeconds: parseInt(process.env.TTS_CACHE_TTL ?? '86400', 10), // 24 hours default
  },
});
