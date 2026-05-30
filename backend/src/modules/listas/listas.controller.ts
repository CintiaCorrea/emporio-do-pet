import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListasService } from './listas.service';
import { CreateListaItemDto, UpdateListaItemDto } from './dto/lista.dto';

@ApiTags('listas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('listas')
export class ListasController {
  constructor(private readonly service: ListasService) {}

  @Get()
  findAll(
    @Query('lista') lista?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.service.findAll(lista, includeInactive === 'true');
  }

  @Post()
  create(@Body() dto: CreateListaItemDto) { return this.service.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateListaItemDto) { return this.service.update(id, dto); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Post('seed')
  seedPacoteInicial() { return this.service.seedPacoteInicial(); }
}
