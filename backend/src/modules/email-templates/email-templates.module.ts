import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailTemplatesService } from './email-templates.service';
import { EmailTemplatesController } from './email-templates.controller';

@Module({ imports: [PrismaModule], controllers: [EmailTemplatesController], providers: [EmailTemplatesService], exports: [EmailTemplatesService] })
export class EmailTemplatesModule {}
