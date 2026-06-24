import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { CadenciasService } from './cadencias.service';
import { CadenciasController } from './cadencias.controller';

@Module({ imports: [PrismaModule, WhatsAppModule], controllers: [CadenciasController], providers: [CadenciasService], exports: [CadenciasService] })
export class CadenciasModule {}
