import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WhatsAppCampaignsController } from './whatsapp-campaigns.controller';
import { WhatsAppCampaignsService } from './whatsapp-campaigns.service';
import { WhatsAppCampaignsProcessor } from './whatsapp-campaigns.processor';
import { WhatsAppCampaignsScheduler } from './whatsapp-campaigns.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'whatsapp-campaigns',
    }),
    PrismaModule,
    WhatsAppModule,
  ],
  controllers: [WhatsAppCampaignsController],
  providers: [WhatsAppCampaignsService, WhatsAppCampaignsProcessor, WhatsAppCampaignsScheduler],
  exports: [WhatsAppCampaignsService],
})
export class WhatsAppCampaignsModule {}
