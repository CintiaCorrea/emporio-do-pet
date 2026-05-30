import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CampanhasService } from './campanhas.service';
import { CampanhasController } from './campanhas.controller';

@Module({ imports: [PrismaModule], controllers: [CampanhasController], providers: [CampanhasService], exports: [CampanhasService] })
export class CampanhasModule {}
