import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ListasService } from './listas.service';
import { ListasController } from './listas.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ListasController],
  providers: [ListasService],
  exports: [ListasService],
})
export class ListasModule {}
