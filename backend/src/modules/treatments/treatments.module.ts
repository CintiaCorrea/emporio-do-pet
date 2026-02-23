import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TreatmentsController } from './treatments.controller';
import { TreatmentsService } from './treatments.service';

@Module({
  imports: [PrismaModule],
  controllers: [TreatmentsController],
  providers: [TreatmentsService],
})
export class TreatmentsModule {}
