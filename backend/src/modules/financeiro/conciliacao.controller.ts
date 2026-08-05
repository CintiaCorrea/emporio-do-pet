import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConciliacaoService } from './conciliacao.service';
import { PreviewConciliacaoDto, ConfirmarConciliacaoDto } from './dto/conciliacao.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('financeiro/conciliacao')
@Controller('financeiro/conciliacao')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConciliacaoController {
  constructor(private readonly service: ConciliacaoService) {}

  @Post('preview')
  @ApiOperation({ summary: 'Casar o extrato com os pendentes (proposta, não grava)' })
  preview(@Body() dto: PreviewConciliacaoDto) {
    return this.service.preview(dto);
  }

  @Post('confirmar')
  @ApiOperation({ summary: 'Aplicar as ações: conciliar casados + criar sem par' })
  confirmar(@Body() dto: ConfirmarConciliacaoDto) {
    return this.service.confirmar(dto);
  }
}
