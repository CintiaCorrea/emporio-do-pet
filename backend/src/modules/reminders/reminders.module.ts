import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { RemindersScheduler } from './reminders.scheduler';
import { RemindersController } from './reminders.controller';

@Module({
  imports: [PrismaModule, WhatsAppModule],
  controllers: [RemindersController],
  providers: [RemindersScheduler],
})
export class RemindersModule {}
