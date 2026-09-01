import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MetaMessagingService } from './meta-messaging.service';
import { MetaWebhookController, MetaMessagingController } from './meta-messaging.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MetaWebhookController, MetaMessagingController],
  providers: [MetaMessagingService],
  exports: [MetaMessagingService],
})
export class MetaMessagingModule {}
