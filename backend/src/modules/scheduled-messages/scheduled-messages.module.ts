import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { ScheduledMessagesService } from './scheduled-messages.service';
import { ScheduledMessagesController } from './scheduled-messages.controller';

@Module({
  imports: [PrismaModule, WhatsAppModule],
  controllers: [ScheduledMessagesController],
  providers: [ScheduledMessagesService],
})
export class ScheduledMessagesModule {}
