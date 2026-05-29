import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InternalNotesService } from './internal-notes.service';
import { InternalNotesController } from './internal-notes.controller';

@Module({
  imports: [PrismaModule],
  controllers: [InternalNotesController],
  providers: [InternalNotesService],
})
export class InternalNotesModule {}
