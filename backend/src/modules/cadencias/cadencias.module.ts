import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CadenciasService } from './cadencias.service';
import { CadenciasController } from './cadencias.controller';

@Module({ imports: [PrismaModule], controllers: [CadenciasController], providers: [CadenciasService], exports: [CadenciasService] })
export class CadenciasModule {}
