import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { HospitalizationsModule } from '../hospitalizations/hospitalizations.module';
import { InternacaoBoletimScheduler } from './internacao-boletim.scheduler';
import { InternacaoBoletimController } from './internacao-boletim.controller';

@Module({
  imports: [PrismaModule, WhatsAppModule, HospitalizationsModule],
  controllers: [InternacaoBoletimController],
  providers: [InternacaoBoletimScheduler],
})
export class InternacaoBoletimModule {}
