import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Type for Prisma transaction client - use this in services
export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
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
    const portaAjustada = !!originalDatabaseUrl && databaseUrl !== originalDatabaseUrl;

    // Estabilidade do pool (SOMENTE produção). O Postgres suporta max_connections=300, mas cada
    // instância abria apenas 60 conexões — em picos de acesso simultâneo a 61ª requisição ficava
    // na fila até estourar ("Timed out fetching a new connection from the connection pool").
    // Elevamos o teto para 100 por instância (2 instâncias = 200, com folga sobre 300).
    // Só em produção para não exceder o max_connections padrão (100) de um Postgres local de dev.
    if (databaseUrl && process.env.NODE_ENV === 'production') {
      // 40/máquina × 2 = 80 conexões (antes 100→~195, que sufocava o banco de CPU
      // compartilhada e dava "Can't reach database"). Com o polling já afrouxado,
      // 40 é suficiente e alivia MUITO o banco. Rever ao subir o banco (à noite).
      const ALVO = 40;
      // FORÇA o valor (não só aumenta) — precisamos poder REDUZIR pra aliviar o banco.
      if (/([?&]connection_limit=)\d+/.test(databaseUrl)) {
        databaseUrl = databaseUrl.replace(/([?&]connection_limit=)\d+/, `$1${ALVO}`);
      } else {
        databaseUrl += (databaseUrl.includes('?') ? '&' : '?') + `connection_limit=${ALVO}`;
      }
      if (!/[?&]pool_timeout=/.test(databaseUrl)) {
        databaseUrl += '&pool_timeout=30';
      }
    }

    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
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
    }
    if (portaAjustada) {
      this.logger.warn(
        `DATABASE_URL apontava para uma porta antiga (55432). Ajustado automaticamente. ` +
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
