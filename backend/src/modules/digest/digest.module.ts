import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CaixaModule } from '../caixa/caixa.module';
import { AvaliacoesModule } from '../avaliacoes/avaliacoes.module';
import { DigestService } from './digest.service';
import { DigestController } from './digest.controller';

// EmailModule é @Global — EmailService fica injetável sem importar aqui.
@Module({
  imports: [PrismaModule, CaixaModule, AvaliacoesModule],
  controllers: [DigestController],
  providers: [DigestService],
})
export class DigestModule {}
