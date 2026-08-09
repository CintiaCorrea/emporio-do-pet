import { Module } from '@nestjs/common';
import { CaixaService } from './caixa.service';
import { CaixaController } from './caixa.controller';
import { CaixaFechamentoScheduler } from './caixa-fechamento.scheduler';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [AppointmentsModule],
  controllers: [CaixaController],
  providers: [CaixaService, CaixaFechamentoScheduler],
  exports: [CaixaService],
})
export class CaixaModule {}
