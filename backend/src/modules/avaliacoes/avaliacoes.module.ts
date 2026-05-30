import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AvaliacoesService } from './avaliacoes.service';
import { AvaliacoesController } from './avaliacoes.controller';

@Module({ imports: [PrismaModule], controllers: [AvaliacoesController], providers: [AvaliacoesService], exports: [AvaliacoesService] })
export class AvaliacoesModule {}
