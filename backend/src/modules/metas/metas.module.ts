import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MetasService } from './metas.service';
import { MetasController } from './metas.controller';

@Module({ imports: [PrismaModule], controllers: [MetasController], providers: [MetasService], exports: [MetasService] })
export class MetasModule {}
