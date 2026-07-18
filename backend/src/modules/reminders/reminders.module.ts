import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { RemindersScheduler } from './reminders.scheduler';

@Module({
  imports: [PrismaModule, WhatsAppModule],
  providers: [RemindersScheduler],
})
export class RemindersModule {}
