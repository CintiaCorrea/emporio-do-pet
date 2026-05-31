import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InteracoesService } from './interacoes.service';
import { CreateInteracaoDto } from './dto/create-interacao.dto';
import { UpdateInteracaoDto } from './dto/update-interacao.dto';

@ApiTags('interacoes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('interacoes')
export class InteracoesController {
  constructor(private readonly service: InteracoesService) {}

  @Post()
  create(@Body() dto: CreateInteracaoDto, @Req() req: any) {
    const userId = dto.autorUserId || req.user?.userId || req.user?.id;
    return this.service.create({ ...dto, autorUserId: userId });
  }

  @Get()
  findAll(
    @Query('leadId') leadId?: string,
    @Query('tutorId') tutorId?: string,
    @Query('petId') petId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({ leadId, tutorId, petId, limit: limit ? Number(limit) : undefined });
  }

  @Get(':id') findById(@Param('id') id: string) { return this.service.findById(id); }

  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateInteracaoDto) { return this.service.update(id, dto); }

  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
