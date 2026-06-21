import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrcamentosService } from './orcamentos.service';
import { CreateOrcamentoDto } from './dto/create-orcamento.dto';
import { UpdateOrcamentoDto } from './dto/update-orcamento.dto';
import { ConverterOrcamentoDto } from './dto/converter-orcamento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('orcamentos')
@Controller('orcamentos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrcamentosController {
  constructor(private readonly orcamentosService: OrcamentosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar orçamentos por pet' })
  @ApiQuery({ name: 'petId', required: true })
  findByPet(@Query('petId') petId: string) {
    return this.orcamentosService.findByPet(petId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do orçamento' })
  findOne(@Param('id') id: string) {
    return this.orcamentosService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar orçamento' })
  create(@Body() dto: CreateOrcamentoDto, @CurrentUser('id') userId: string) {
    return this.orcamentosService.create(dto, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar orçamento (status, validade, itens)' })
  update(@Param('id') id: string, @Body() dto: UpdateOrcamentoDto) {
    return this.orcamentosService.update(id, dto);
  }

  @Post(':id/aprovar')
  @ApiOperation({ summary: 'Aprovar orçamento' })
  aprovar(@Param('id') id: string) {
    return this.orcamentosService.aprovar(id);
  }

  @Post(':id/converter')
  @ApiOperation({ summary: 'Converter orçamento em venda (cria atendimento com os itens)' })
  converter(@Param('id') id: string, @Body() dto: ConverterOrcamentoDto, @CurrentUser('id') userId: string) {
    return this.orcamentosService.converter(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir orçamento' })
  remove(@Param('id') id: string) {
    return this.orcamentosService.remove(id);
  }
}
