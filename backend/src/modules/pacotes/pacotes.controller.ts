import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PacotesService } from './pacotes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('pacotes')
@Controller('pacotes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PacotesController {
  constructor(private readonly service: PacotesService) {}

  // Painel "Pacotes vendidos" — lê a fonte ÚNICA (petpac_). O CRUD da tabela Pacote (legada,
  // vazia, sem uso no front) foi removido na unificação. Tudo de pacote passa por petpac_.
  @Get('vendidos')
  vendidos(@Query('todos') todos?: string) {
    return this.service.listVendidos(todos === 'true');
  }
}
