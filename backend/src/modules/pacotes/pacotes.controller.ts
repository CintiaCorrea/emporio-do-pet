import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PacotesService } from './pacotes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('pacotes')
@Controller('pacotes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PacotesController {
  constructor(private readonly service: PacotesService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get('pet/:petId')
  byPet(@Param('petId') petId: string) {
    return this.service.findByPet(petId);
  }

  @Get('tutor/:tutorId')
  byTutor(@Param('tutorId') tutorId: string) {
    return this.service.findByTutor(tutorId);
  }

  @Post()
  create(@Body() dto: any, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Post('comparecimento')
  comparecimento(@Body() dto: any, @CurrentUser('id') userId: string) {
    return this.service.registrarComparecimento(dto, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/sessao')
  sessao(@Param('id') id: string, @Body() dto: any, @CurrentUser('id') userId: string) {
    return this.service.registrarSessao(id, dto, userId);
  }

  @Patch(':id/cancelar')
  cancelar(@Param('id') id: string) {
    return this.service.cancelar(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
