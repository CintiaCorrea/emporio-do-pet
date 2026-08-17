import { Module } from '@nestjs/common';
import { OrcamentosService } from './orcamentos.service';
import { OrcamentosController } from './orcamentos.controller';
import { AppointmentsModule } from '../appointments/appointments.module';
import { ExamesModule } from '../exames/exames.module';

@Module({
  imports: [AppointmentsModule, ExamesModule],
  controllers: [OrcamentosController],
  providers: [OrcamentosService],
  exports: [OrcamentosService],
})
export class OrcamentosModule {}
