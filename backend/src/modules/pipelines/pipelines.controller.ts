import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PipelinesService } from './pipelines.service';
import { CreatePipelineDto, UpdatePipelineDto, CreateEstagioDto, UpdateEstagioDto } from './dto/pipeline.dto';

@ApiTags('pipelines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pipelines')
export class PipelinesController {
  constructor(private readonly service: PipelinesService) {}

  @Get()
  list(@Query('includeInactive') includeInactive?: string) { return this.service.list(includeInactive === 'true'); }
  @Post()
  create(@Body() dto: CreatePipelineDto) { return this.service.create(dto); }
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePipelineDto) { return this.service.update(id, dto); }
  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Post('estagios')
  createEstagio(@Body() dto: CreateEstagioDto) { return this.service.createEstagio(dto); }
  @Patch('estagios/:id')
  updateEstagio(@Param('id') id: string, @Body() dto: UpdateEstagioDto) { return this.service.updateEstagio(id, dto); }
  @Delete('estagios/:id')
  removeEstagio(@Param('id') id: string) { return this.service.removeEstagio(id); }

  @Post('seed-pacote-inicial')
  seed() { return this.service.seedPacoteInicial(); }
}
