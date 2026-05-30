import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PipelinesService } from './pipelines.service';
import { PipelinesController } from './pipelines.controller';

@Module({ imports: [PrismaModule], controllers: [PipelinesController], providers: [PipelinesService], exports: [PipelinesService] })
export class PipelinesModule {}
