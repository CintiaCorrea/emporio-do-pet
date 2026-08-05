import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecorrenciasService } from './recorrencias.service';
import { CreateRecorrenciaDto } from './dto/create-recorrencia.dto';
import { UpdateRecorrenciaDto } from './dto/update-recorrencia.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('financeiro/recorrencias')
@Controller('financeiro/recorrencias')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecorrenciasController {
  constructor(private readonly service: RecorrenciasService) {}

  @Post()
  @ApiOperation({ summary: 'Criar recorrência' })
  create(@Body() dto: CreateRecorrenciaDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar recorrências' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar recorrência por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar recorrência (pausar = ativo:false)' })
  update(@Param('id') id: string, @Body() dto: UpdateRecorrenciaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir recorrência (mantém lançamentos já gerados)' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
