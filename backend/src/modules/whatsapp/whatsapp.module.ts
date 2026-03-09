import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppConversationsController } from './whatsapp-conversations.controller';
import { WhatsAppAnalyticsController } from './whatsapp-analytics.controller';
import { WhatsAppWebhooksController } from './whatsapp-webhooks.controller';
import { WhatsAppAIConfigController } from './whatsapp-ai-config.controller';
import { WhatsAppAgentListener } from './whatsapp-agent.listener';
import { PrismaModule } from '../prisma/prisma.module';
import { AgentsModule } from '../agents/agents.module';
import { AudioModule } from '../audio/audio.module';
import { MediaModule } from '../media/media.module';
import {
  WebhookReplayService,
  WhatsAppAnalyticsService,
  PhoneFormatterService,
} from './services';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    PrismaModule,
    forwardRef(() => AgentsModule),
    AudioModule,
    MediaModule,
  ],
  controllers: [
    WhatsAppController,
    WhatsAppConversationsController,
    WhatsAppAnalyticsController,
    WhatsAppWebhooksController,
    WhatsAppAIConfigController,
  ],
  providers: [
    WhatsAppService,
    WhatsAppAgentListener,
    WebhookReplayService,
    WhatsAppAnalyticsService,
    PhoneFormatterService,
  ],
  exports: [
    WhatsAppService,
    WebhookReplayService,
    WhatsAppAnalyticsService,
    PhoneFormatterService,
  ],
})
export class WhatsAppModule {}
