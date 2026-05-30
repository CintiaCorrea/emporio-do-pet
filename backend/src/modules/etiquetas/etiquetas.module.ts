import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EtiquetasService } from './etiquetas.service';
import { EtiquetasController } from './etiquetas.controller';

@Module({
  imports: [PrismaModule],
  controllers: [EtiquetasController],
  providers: [EtiquetasService],
  exports: [EtiquetasService],
})
export class EtiquetasModule {}
