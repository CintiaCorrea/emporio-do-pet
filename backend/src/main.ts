import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

  // Global prefix para todas as rotas da API
  app.setGlobalPrefix('api');

  // Configuração de CORS
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000'],
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

  await app.listen(port);
  logger.log(`🚀 Backend rodando em: http://localhost:${port}`);
  logger.log(`🌐 Frontend URL configurado: ${frontendUrl}`);
}

bootstrap();

