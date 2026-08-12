import { Module } from '@nestjs/common';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExamesController } from './exames.controller';
import { ExamesService } from './exames.service';
import { ExamesScheduler } from './exames.scheduler';

// PrismaModule é @Global — PrismaService já está disponível.
@Module({
  imports: [WhatsAppModule, NotificationsModule],
  controllers: [ExamesController],
  providers: [ExamesService, ExamesScheduler],
  exports: [ExamesService],
})
export class ExamesModule {}
