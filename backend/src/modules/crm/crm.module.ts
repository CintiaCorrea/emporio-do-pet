import { Module, Global, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CrmIntegrationService } from './crm-integration.service';
import { CrmAutomationListener } from './crm-automation.listener';
import { CrmController } from './crm.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    forwardRef(() => WhatsAppModule),
    BullModule.registerQueue({
      name: 'automations',
    }),
  ],
  controllers: [CrmController],
  providers: [CrmIntegrationService, CrmAutomationListener],
  exports: [CrmIntegrationService],
})
export class CrmModule {}
