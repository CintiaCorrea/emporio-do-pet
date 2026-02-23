import { Module } from '@nestjs/common';
import { ConsultationRecordingsController } from './consultation-recordings.controller';
import { ConsultationRecordingsService } from './consultation-recordings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AIModule } from '../ai/ai.module';
import { AudioModule } from '../audio/audio.module';

@Module({
  imports: [PrismaModule, AIModule, AudioModule],
  controllers: [ConsultationRecordingsController],
  providers: [ConsultationRecordingsService],
  exports: [ConsultationRecordingsService],
})
export class ConsultationRecordingsModule {}
