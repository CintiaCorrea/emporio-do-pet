import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicCadastroController } from './public-cadastro.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PublicCadastroController],
})
export class PublicCadastroModule {}
