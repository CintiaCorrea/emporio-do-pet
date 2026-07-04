import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AniversariosService } from './aniversarios.service';
import { AniversariosController } from './aniversarios.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AniversariosController],
  providers: [AniversariosService],
  exports: [AniversariosService],
})
export class AniversariosModule {}
