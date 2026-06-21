import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProtocolosService } from './protocolos.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { AplicarProtocoloDto, RegistrarDoseDto } from './dto/aplicar.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('protocolos')
@Controller('protocolos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProtocolosController {
  constructor(private readonly service: ProtocolosService) {}

  // ----- Catalogo (templates) -----
  @Get('templates')
  @ApiOperation({ summary: 'Listar templates do catalogo' })
  @ApiQuery({ name: 'tipo', required: false })
  listTemplates(@Query('tipo') tipo?: string) {
    return this.service.listTemplates(tipo);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Criar template' })
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.service.createTemplate(dto);
  }

  @Patch('templates/:id')
  @ApiOperation({ summary: 'Editar template' })
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.service.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Excluir template' })
  removeTemplate(@Param('id') id: string) {
    return this.service.removeTemplate(id);
  }

  @Post('templates/seed')
  @ApiOperation({ summary: 'Semear catalogo com os protocolos do SimplesVet (idempotente)' })
  seed() {
    return this.service.seedTemplates();
  }

  // ----- Protocolos aplicados -----
  @Get()
  @ApiOperation({ summary: 'Listar protocolos aplicados por pet' })
  @ApiQuery({ name: 'petId', required: true })
  findByPet(@Query('petId') petId: string) {
    return this.service.findByPet(petId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do protocolo aplicado' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Aplicar protocolo no pet (gera as doses)' })
  aplicar(@Body() dto: AplicarProtocoloDto, @CurrentUser('id') userId: string) {
    return this.service.aplicar(dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir protocolo aplicado' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // ----- Doses -----
  @Get('doses/pendentes')
  @ApiOperation({ summary: 'Doses pendentes (vencidas + proximos N dias) p/ Hoje/Calendario' })
  @ApiQuery({ name: 'dias', required: false })
  dosesPendentes(@Query('dias') dias?: string) {
    return this.service.dosesPendentes(dias ? Number(dias) : 7);
  }

  @Patch('doses/:doseId')
  @ApiOperation({ summary: 'Registrar/atualizar dose (aplicar com lote/fabricante, cancelar, etc.)' })
  registrarDose(@Param('doseId') doseId: string, @Body() dto: RegistrarDoseDto) {
    return this.service.registrarDose(doseId, dto);
  }
}
