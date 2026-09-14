import { Module } from '@nestjs/common';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExamesController } from './exames.controller';
import { ExamesService } from './exames.service';
import { ExamesScheduler } from './exames.scheduler';
import { ExameEntregueReplyListener } from './exame-entregue-reply.listener';

// PrismaModule é @Global — PrismaService já está disponível.
@Module({
  imports: [WhatsAppModule, NotificationsModule],
  controllers: [ExamesController],
  // O ouvinte precisa estar AQUI para existir: listener registrado em nenhum módulo nunca é
  // instanciado, e o @OnEvent simplesmente não dispara — sem erro, sem log, sem nada.
  providers: [ExamesService, ExamesScheduler, ExameEntregueReplyListener],
  exports: [ExamesService],
})
export class ExamesModule {}
