import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AvaliacoesService } from './avaliacoes.service';
import { AvaliacoesController } from './avaliacoes.controller';

@Module({ imports: [PrismaModule, NotificationsModule], controllers: [AvaliacoesController], providers: [AvaliacoesService], exports: [AvaliacoesService] })
export class AvaliacoesModule {}
