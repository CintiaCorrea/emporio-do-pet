import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TutorsModule } from './modules/tutors/tutors.module';
import { PetsModule } from './modules/pets/pets.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { BoardsModule } from './modules/boards/boards.module';
import { ColumnsModule } from './modules/columns/columns.module';
import { NewslettersModule } from './modules/newsletters/newsletters.module';
import { HealthModule } from './modules/health/health.module';
import { ProductsModule } from './modules/products/products.module';
import { TreatmentsModule } from './modules/treatments/treatments.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { StockModule } from './modules/stock/stock.module';
import { CommissionsModule } from './modules/commissions/commissions.module';
import { HospitalizationsModule } from './modules/hospitalizations/hospitalizations.module';
import { FinanceModule } from './modules/finance/finance.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
// CRM B2C Modules
import { LeadsModule } from './modules/leads/leads.module';
import { EnrichmentModule } from './modules/enrichment/enrichment.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { InsightsModule } from './modules/insights/insights.module';
import configuration from './config/configuration';

@Module({
  imports: [
    // Configuração global
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // BullMQ para filas de processamento assíncrono
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get('redis');
        
        // Se tiver REDIS_URL (Upstash/Fly.io), usar ela
        if (redisConfig.url) {
          return {
            connection: {
              url: redisConfig.url,
              tls: redisConfig.tls ? {} : undefined,
            },
          };
        }
        
        // Caso contrário, usar host/port/password
        return {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password || undefined,
            db: redisConfig.db,
          },
        };
      },
    }),

    // Módulos de infraestrutura
    PrismaModule,
    RedisModule,

    // Módulos de negócio
    AuthModule,
    UsersModule,
    TutorsModule,
    PetsModule,
    AppointmentsModule,
    BoardsModule,
    ColumnsModule,
    NewslettersModule,
    ProductsModule,
    TreatmentsModule,
    ClientsModule,
    ContactsModule,
    StockModule,
    CommissionsModule,
    HospitalizationsModule,
    FinanceModule,
    DashboardModule,

    // CRM B2C - Leads com Insights Preditivos
    LeadsModule,
    EnrichmentModule,
    ScoringModule,
    InsightsModule,

    // Health check
    HealthModule,
  ],
})
export class AppModule {}

