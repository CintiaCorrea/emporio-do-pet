import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BoardsModule } from '../boards/boards.module';
import { HospitalizationsController } from './hospitalizations.controller';
import { HospitalizationsService } from './hospitalizations.service';

@Module({
  imports: [PrismaModule, BoardsModule],
  controllers: [HospitalizationsController],
  providers: [HospitalizationsService],
})
export class HospitalizationsModule {}
