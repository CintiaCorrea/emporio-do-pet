import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecebimentosService } from './recebimentos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('financeiro')
@Controller('financeiro/recebimentos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecebimentosController {
  constructor(private readonly service: RecebimentosService) {}

  @Post('processar')
  @ApiOperation({ summary: 'Gera lançamentos de RECEITA das vendas concluídas no caixa (idempotente)' })
  processar() {
    return this.service.processar();
  }
}
