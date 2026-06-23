import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CaixaService } from './caixa.service';
import { AbrirCaixaDto } from './dto/abrir-caixa.dto';
import { RecebimentoDto } from './dto/recebimento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('caixa')
@Controller('caixa')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CaixaController {
  constructor(private readonly service: CaixaService) {}

  @Get()
  findDoDia(@Query('date') date?: string) {
    return this.service.findDoDia(date);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  abrir(@Body() dto: AbrirCaixaDto, @CurrentUser('id') userId: string) {
    return this.service.abrir(dto, userId);
  }

  @Patch(':id/fechar')
  fechar(@Param('id') id: string) {
    return this.service.fechar(id);
  }

  @Post(':id/recebimento')
  receber(@Param('id') id: string, @Body() dto: RecebimentoDto, @CurrentUser('id') userId: string) {
    return this.service.registrarRecebimento(id, dto, userId);
  }
}
