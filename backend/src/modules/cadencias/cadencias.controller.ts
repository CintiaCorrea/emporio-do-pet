import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CadenciasService } from './cadencias.service';
import { CreateCadenciaDto, UpdateCadenciaDto, CreatePassoDto, UpdatePassoDto } from './dto/cadencia.dto';

@ApiTags('cadencias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cadencias')
export class CadenciasController {
  constructor(private readonly service: CadenciasService) {}

  @Get()
  list(@Query('includeInactive') includeInactive?: string) {
    return this.service.list(includeInactive === 'true');
  }
  @Post()
  create(@Body() dto: CreateCadenciaDto) { return this.service.create(dto); }
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCadenciaDto) { return this.service.update(id, dto); }
  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Post('passos')
  createPasso(@Body() dto: CreatePassoDto) { return this.service.createPasso(dto); }
  @Patch('passos/:id')
  updatePasso(@Param('id') id: string, @Body() dto: UpdatePassoDto) { return this.service.updatePasso(id, dto); }
  @Delete('passos/:id')
  removePasso(@Param('id') id: string) { return this.service.removePasso(id); }

  @Post('seed-pacote-inicial')
  seed() { return this.service.seedPacoteInicial(); }
}
