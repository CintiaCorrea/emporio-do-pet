import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EspecieRaca } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RacasService } from './racas.service';
import { CreateRacaDto, UpdateRacaDto } from './dto/raca.dto';

@ApiTags('racas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('racas')
export class RacasController {
  constructor(private readonly service: RacasService) {}

  @Get()
  findAll(
    @Query('especie') especie?: EspecieRaca,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.service.findAll(especie, includeInactive === 'true');
  }

  @Post()
  create(@Body() dto: CreateRacaDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRacaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('seed')
  seedPacoteInicial() {
    return this.service.seedPacoteInicial();
  }
}
