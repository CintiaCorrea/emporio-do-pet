import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommissionsController } from './commissions.controller';
import { CommissionsService } from './commissions.service';
import { FinanceiroModule } from '../financeiro/financeiro.module';

@Module({
  imports: [PrismaModule, FinanceiroModule],
  controllers: [CommissionsController],
  providers: [CommissionsService],
})
export class CommissionsModule {}
