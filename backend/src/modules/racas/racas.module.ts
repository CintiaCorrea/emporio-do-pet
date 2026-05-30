import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RacasService } from './racas.service';
import { RacasController } from './racas.controller';

@Module({
  imports: [PrismaModule],
  controllers: [RacasController],
  providers: [RacasService],
  exports: [RacasService],
})
export class RacasModule {}
