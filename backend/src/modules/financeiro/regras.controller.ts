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
import { RegrasService } from './regras.service';
import { CreateRegraDto } from './dto/create-regra.dto';
import { UpdateRegraDto } from './dto/update-regra.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('financeiro/regras')
@Controller('financeiro/regras')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RegrasController {
  constructor(private readonly service: RegrasService) {}

  @Post()
  @ApiOperation({ summary: 'Criar regra de classificação' })
  create(@Body() dto: CreateRegraDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar regras' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar regra por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar regra' })
  update(@Param('id') id: string, @Body() dto: UpdateRegraDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir regra' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/aplicar')
  @ApiOperation({ summary: 'Aplicar a regra aos lançamentos a classificar' })
  aplicar(@Param('id') id: string) {
    return this.service.aplicarAosPendentes(id);
  }
}
