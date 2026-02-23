import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AIModule } from '../ai/ai.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [PrismaModule, AIModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}

