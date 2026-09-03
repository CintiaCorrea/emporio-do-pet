import { Module } from '@nestjs/common';
import { CaixaService } from './caixa.service';
import { CaixaController } from './caixa.controller';
import { CaixaFechamentoScheduler } from './caixa-fechamento.scheduler';
import { AppointmentsModule } from '../appointments/appointments.module';
import { ExamesModule } from '../exames/exames.module';
import { FinanceiroModule } from '../financeiro/financeiro.module';
import { CatalogoModule } from '../catalogo/catalogo.module';

@Module({
  imports: [AppointmentsModule, ExamesModule, FinanceiroModule, CatalogoModule],
  controllers: [CaixaController],
  providers: [CaixaService, CaixaFechamentoScheduler],
  exports: [CaixaService],
})
export class CaixaModule {}
