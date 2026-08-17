import { Module } from '@nestjs/common';
import { CreditoService } from './credito.service';
import { CreditoController } from './credito.controller';
import { FinanceiroModule } from '../financeiro/financeiro.module';

@Module({
  imports: [FinanceiroModule],
  controllers: [CreditoController],
  providers: [CreditoService],
  exports: [CreditoService],
})
export class CreditoModule {}
