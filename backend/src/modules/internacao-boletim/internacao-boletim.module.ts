import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { InternacaoBoletimScheduler } from './internacao-boletim.scheduler';
import { InternacaoBoletimController } from './internacao-boletim.controller';

@Module({
  imports: [PrismaModule, WhatsAppModule],
  controllers: [InternacaoBoletimController],
  providers: [InternacaoBoletimScheduler],
})
export class InternacaoBoletimModule {}
