import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    let databaseUrl = originalDatabaseUrl;

    // Auto-fix para Windows: algumas portas podem ficar "excluded"/reservadas e o Docker não consegue bindar.
    // No compose isolado do Empório (`docker-compose.emporio.yml`) o Postgres roda em localhost:15432.
    // Se o usuário ainda estiver com um `.env` antigo apontando para localhost:55432, ajustamos aqui.
    if (databaseUrl) {
      databaseUrl = databaseUrl
        .replace('localhost:55432', 'localhost:15432')
        .replace('127.0.0.1:55432', '127.0.0.1:15432');
    }

    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
      ...(databaseUrl
        ? {
            datasources: {
              db: { url: databaseUrl },
            },
          }
        : {}),
    });

    if (originalDatabaseUrl && databaseUrl !== originalDatabaseUrl) {
      // Mantém coerência para outros consumers que leem process.env diretamente.
      process.env.DATABASE_URL = databaseUrl;
      this.logger.warn(
        `DATABASE_URL apontava para uma porta antiga (55432). Ajustado automaticamente para ${databaseUrl}. ` +
          `Se você não estiver usando o docker-compose.emporio.yml, atualize seu .env.`,
      );
    }
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Conectado ao PostgreSQL');
    } catch (error) {
      this.logger.error('❌ Erro ao conectar ao PostgreSQL:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 Desconectado do PostgreSQL');
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Não é permitido limpar banco em produção');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$'),
    ) as string[];

    return Promise.all(
      models.map((modelKey) => {
        const model = (this as any)[modelKey];
        if (model && typeof model.deleteMany === 'function') {
          return model.deleteMany();
        }
      }),
    );
  }
}

