import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('pets')
@Controller('pets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar novo pet' })
  create(@Body() createPetDto: CreatePetDto) {
    return this.petsService.create(createPetDto);
  }

  @Get('historico/:histId')
  @ApiOperation({ summary: 'Detalhe (texto completo) de um registro do histórico' })
  getHistoricoItem(@Param('histId') histId: string) {
    return this.petsService.getHistoricoItem(histId);
  }

  @Get('historico/:histId/arquivo')
  @ApiOperation({ summary: 'Baixar/visualizar o arquivo (PDF) do registro — privado, só logado' })
  async getArquivo(@Param('histId') histId: string, @Res() res: Response) {
    const f = await this.petsService.getArquivo(histId);
    if (!f) return res.status(404).json({ error: 'Arquivo não encontrado' });
    res.setHeader('Content-Type', f.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(f.nome)}"`);
    return res.send(f.buffer);
  }

  @Get(':id/historico')
  @ApiOperation({ summary: 'Histórico clínico (importado) do pet' })
  getHistorico(@Param('id') id: string) {
    return this.petsService.getHistorico(id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar pets' })
  @ApiQuery({ name: 'tutorId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'species', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  findAll(
    @Query('tutorId') tutorId?: string,
    @Query('search') search?: string,
    @Query('species') species?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.petsService.findAll({
      tutorId,
      search,
      species,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      skip,
      take,
    });
  }

  @Get('lista-simples')
  @ApiOperation({ summary: 'Lista leve de todos os pets em ordem alfabetica' })
  listaSimples() {
    return this.petsService.listaSimples();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar pet por ID' })
  findOne(@Param('id') id: string) {
    return this.petsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar pet' })
  update(@Param('id') id: string, @Body() updatePetDto: UpdatePetDto) {
    return this.petsService.update(id, updatePetDto);
  }

  @Patch(':id/transferir')
  @ApiOperation({ summary: 'Transferir pet para outro cliente (mesclagem de duplicados)' })
  transferir(@Param('id') id: string, @Body() body: { tutorId: string }) {
    return this.petsService.transferir(id, body?.tutorId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover pet' })
  remove(@Param('id') id: string) {
    return this.petsService.remove(id);
  }

  @Get(':id/profile-stats')
  profileStats(@Param('id') id: string) { return this.petsService.profileStats(id); }
}