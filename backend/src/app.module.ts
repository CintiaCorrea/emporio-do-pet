import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TutorsModule } from './modules/tutors/tutors.module';
import { InboxModule } from './modules/inbox/inbox.module';
import { HojeModule } from './modules/hoje/hoje.module';
import { BotconversaWebhookModule } from './modules/webhooks/botconversa/botconversa-webhook.module';
import { PetsModule } from './modules/pets/pets.module';
import { BreedsModule } from './modules/breeds/breeds.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { BoardsModule } from './modules/boards/boards.module';
import { ColumnsModule } from './modules/columns/columns.module';
import { NewslettersModule } from './modules/newsletters/newsletters.module';
import { HealthModule } from './modules/health/health.module';
import { ProductsModule } from './modules/products/products.module';
import { TreatmentsModule } from './modules/treatments/treatments.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { StockModule } from './modules/stock/stock.module';
import { CommissionsModule } from './modules/commissions/commissions.module';
import { HospitalizationsModule } from './modules/hospitalizations/hospitalizations.module';
import { FinanceModule } from './modules/finance/finance.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
// CRM B2C Modules
import { LeadsModule } from './modules/leads/leads.module';
import { InternalNotesModule } from './modules/internal-notes/internal-notes.module';
import { ScheduledMessagesModule } from './modules/scheduled-messages/scheduled-messages.module';
import { ProfissionaisModule } from './modules/profissionais/profissionais.module';
import { EtiquetasModule } from './modules/etiquetas/etiquetas.module';
import { EnrichmentModule } from './modules/enrichment/enrichment.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { InsightsModule } from './modules/insights/insights.module';
import { AIModule } from './modules/ai/ai.module';
import { AgentsModule } from './modules/agents/agents.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { WhatsAppCampaignsModule } from './modules/whatsapp-campaigns/whatsapp-campaigns.module';
import { WhatsAppTemplatesModule } from './modules/whatsapp-templates/whatsapp-templates.module';
import { EmailModule } from './modules/email/email.module';
import { EventsModule } from './modules/events/events.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AudioModule } from './modules/audio/audio.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { MediaModule } from './modules/media/media.module';
import { ConsultationRecordingsModule } from './modules/consultation-recordings/consultation-recordings.module';
import { ClinicalDocumentsModule } from './modules/clinical-documents/clinical-documents.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { CrmModule } from './modules/crm/crm.module';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module';
import { LandingPagesModule } from './modules/landing-pages/landing-pages.module';
import configuration from './config/configuration';

@Module({
  imports: [
    // Configuração global
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Event Emitter para comunicação interna
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),

    // Schedule para tarefas agendadas (cron jobs)
    ScheduleModule.forRoot(),

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

    // Módulos de comunicação
    WhatsAppModule,
    WhatsAppCampaignsModule,
    WhatsAppTemplatesModule,
    EmailModule,
    EventsModule,

    // Módulos de negócio
    AuthModule,
    UsersModule,
    TutorsModule,
    InboxModule,
    HojeModule,
    BotconversaWebhookModule,
    PetsModule,
    BreedsModule,
    AppointmentsModule,
    BoardsModule,
    ColumnsModule,
    NewslettersModule,
    ProductsModule,
    TreatmentsModule,
    ContactsModule,
    StockModule,
    CommissionsModule,
    HospitalizationsModule,
    FinanceModule,
    DashboardModule,

    // CRM B2C - Leads com Insights Preditivos
    LeadsModule,
    InternalNotesModule,
    ScheduledMessagesModule,
    ProfissionaisModule,
    EtiquetasModule,
    EnrichmentModule,
    ScoringModule,
    InsightsModule,
    
    // CRM Integration (Lead/Client conversions, automations)
    CrmModule,

    // AI Service Integration
    AIModule,
    AudioModule,

    // AI Agents - Agentes, Templates e Automações
    AgentsModule,
    TemplatesModule,
    AutomationsModule,

    // Notificações em tempo real
    NotificationsModule,

    // Integrations settings (CRUD API keys)
    IntegrationsModule,

    // Media storage (WhatsApp media, uploads)
    MediaModule,

    // Documentos Clínicos e Gravação de Consultas
    ConsultationRecordingsModule,
    ClinicalDocumentsModule,
    DocumentsModule,

    // RAG - Knowledge Base
    KnowledgeBaseModule,

    // Landing Pages Builder
    LandingPagesModule,

    // Health check
    HealthModule,
  ],
})
export class AppModule {}
