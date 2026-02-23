import { Module } from '@nestjs/common';
import { ClinicalDocumentsController } from './clinical-documents.controller';
import { ClinicalDocumentsService } from './clinical-documents.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AIModule } from '../ai/ai.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, AIModule, EmailModule],
  controllers: [ClinicalDocumentsController],
  providers: [ClinicalDocumentsService],
  exports: [ClinicalDocumentsService],
})
export class ClinicalDocumentsModule {}
