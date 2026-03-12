import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    // Enable rawBody for webhook signature validation (WhatsApp, Stripe, etc.)
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  // ConfigModule carrega `configuration.ts` (chaves em camelCase)
  const port = configService.get<number>('port', 3001);
  const frontendUrl = configService.get<string>('frontendUrl', 'http://localhost:3000');

  // Global prefix para todas as rotas da API
  app.setGlobalPrefix('api');

  // Configuração de CORS - aceita frontend em produção e desenvolvimento
  const allowedOrigins = [frontendUrl, 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'].filter(
    Boolean,
  );

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requests sem origin (mobile apps, curl, etc)
      if (!origin) return callback(null, true);

      // Verificar se a origin está na lista ou é um domínio permitido
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.fly.dev') ||
        origin.endsWith('.emporiodopet.com.br') ||
        origin === 'https://emporiodopet.com.br'
      ) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Validação global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Configuração do Swagger (documentação da API)
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Empório do Pet API')
      .setDescription('API Backend para o sistema de CRM Veterinário')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Autenticação e autorização')
      .addTag('users', 'Gerenciamento de usuários')
      .addTag('tutors', 'Gerenciamento de tutores')
      .addTag('pets', 'Gerenciamento de pets')
      .addTag('appointments', 'Agendamentos')
      .addTag('boards', 'Kanban boards')
      .addTag('newsletters', 'Email marketing')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);

    logger.log(`📚 Swagger disponível em: http://localhost:${port}/docs`);
  }

  // Escutar em 0.0.0.0 para funcionar no Docker/Fly.io
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Backend rodando em: http://0.0.0.0:${port}`);
  logger.log(`🌐 Frontend URL configurado: ${frontendUrl}`);
}

bootstrap();
