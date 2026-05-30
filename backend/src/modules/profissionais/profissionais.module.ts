import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfissionaisService } from './profissionais.service';
import { ProfissionaisController } from './profissionais.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProfissionaisController],
  providers: [ProfissionaisService],
  exports: [ProfissionaisService],
})
export class ProfissionaisModule {}
