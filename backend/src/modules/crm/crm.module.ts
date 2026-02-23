import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CrmIntegrationService } from './crm-integration.service';
import { CrmAutomationListener } from './crm-automation.listener';
import { CrmController } from './crm.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'automations',
    }),
  ],
  controllers: [CrmController],
  providers: [CrmIntegrationService, CrmAutomationListener],
  exports: [CrmIntegrationService],
})
export class CrmModule {}
