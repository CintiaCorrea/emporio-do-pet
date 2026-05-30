import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AvaliacoesService } from './avaliacoes.service';
import { CreateAvaliacaoNPSDto, UpdateAvaliacaoNPSDto, CreateAvaliacaoGoogleDto, UpdateAvaliacaoGoogleDto } from './dto/avaliacao.dto';

@ApiTags('avaliacoes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('avaliacoes')
export class AvaliacoesController {
  constructor(private readonly service: AvaliacoesService) {}

  @Get('nps') listNPS() { return this.service.listNPS(); }
  @Post('nps') createNPS(@Body() dto: CreateAvaliacaoNPSDto) { return this.service.createNPS(dto); }
  @Patch('nps/:id') updateNPS(@Param('id') id: string, @Body() dto: UpdateAvaliacaoNPSDto) { return this.service.updateNPS(id, dto); }
  @Delete('nps/:id') removeNPS(@Param('id') id: string) { return this.service.removeNPS(id); }

  @Get('google') listGoogle() { return this.service.listGoogle(); }
  @Post('google') createGoogle(@Body() dto: CreateAvaliacaoGoogleDto) { return this.service.createGoogle(dto); }
  @Patch('google/:id') updateGoogle(@Param('id') id: string, @Body() dto: UpdateAvaliacaoGoogleDto) { return this.service.updateGoogle(id, dto); }
  @Delete('google/:id') removeGoogle(@Param('id') id: string) { return this.service.removeGoogle(id); }

  @Get('stats') stats() { return this.service.stats(); }

  @Post('nps/import-batch')
  importNPS(@Body() body: { rows: any[]; upsert?: boolean }) { return this.service.importBatchNPS(body.rows, body.upsert); }
}
