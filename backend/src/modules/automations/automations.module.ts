import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { AutomationsController } from './automations.controller';
import { AutomationsWebhookController } from './automations-webhook.controller';
import { AutomationsService } from './automations.service';
import { AutomationsProcessor } from './automations.processor';
import { AutomationsScheduler } from './automations.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    WhatsAppModule,
    EmailModule,
    BullModule.registerQueue({
      name: 'automations',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AutomationsController, AutomationsWebhookController],
  providers: [AutomationsService, AutomationsProcessor, AutomationsScheduler],
  exports: [AutomationsService, AutomationsScheduler],
})
export class AutomationsModule {}
