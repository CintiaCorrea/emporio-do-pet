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
import { BoxesService } from './boxes.service';
import { CreateBoxDto } from './dto/create-box.dto';
import { UpdateBoxDto } from './dto/update-box.dto';
import { OcuparBoxDto } from './dto/ocupar-box.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('boxes')
@Controller('boxes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BoxesController {
  constructor(private readonly boxesService: BoxesService) {}

  // rota estática ANTES de :id
  @Get('mapa')
  @ApiOperation({ summary: 'Mapa de internação (boxes + ocupação + internação)' })
  mapa() {
    return this.boxesService.mapa();
  }

  @Post()
  @ApiOperation({ summary: 'Criar box' })
  create(@Body() dto: CreateBoxDto) {
    return this.boxesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar boxes' })
  findAll() {
    return this.boxesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar box por ID' })
  findOne(@Param('id') id: string) {
    return this.boxesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar box' })
  update(@Param('id') id: string, @Body() dto: UpdateBoxDto) {
    return this.boxesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir box' })
  remove(@Param('id') id: string) {
    return this.boxesService.remove(id);
  }

  @Post(':id/ocupar')
  @ApiOperation({ summary: 'Internar paciente no box' })
  ocupar(@Param('id') id: string, @Body() dto: OcuparBoxDto) {
    return this.boxesService.ocupar(id, dto);
  }

  @Post(':id/liberar')
  @ApiOperation({ summary: 'Liberar / dar alta do box' })
  liberar(@Param('id') id: string) {
    return this.boxesService.liberar(id);
  }
}
