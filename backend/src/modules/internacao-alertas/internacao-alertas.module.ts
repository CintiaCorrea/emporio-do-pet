import { Module } from '@nestjs/common';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { InternacaoAlertasController } from './internacao-alertas.controller';
import { InternacaoAlertasService } from './internacao-alertas.service';
import { InternacaoAlertasScheduler } from './internacao-alertas.scheduler';
import { MedicacaoConfirmListener } from './medicacao-confirm.listener';

// PrismaModule é @Global — PrismaService já está disponível.
@Module({
  imports: [WhatsAppModule],
  controllers: [InternacaoAlertasController],
  providers: [InternacaoAlertasService, InternacaoAlertasScheduler, MedicacaoConfirmListener],
  exports: [InternacaoAlertasService],
})
export class InternacaoAlertasModule {}
