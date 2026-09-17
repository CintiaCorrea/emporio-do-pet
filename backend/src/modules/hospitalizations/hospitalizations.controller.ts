import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateHospitalizationDto } from './dto/create-hospitalization.dto';
import { UpdateHospitalizationDto } from './dto/update-hospitalization.dto';
import { HospitalizationsService } from './hospitalizations.service';

@ApiTags('hospitalizations')
@Controller('hospitalizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HospitalizationsController {
  constructor(private readonly hospitalizationsService: HospitalizationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar internações (derivadas de appointments)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  list(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    return this.hospitalizationsService.list({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      status,
      priority,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Criar internação (cria appointment)' })
  create(@Body() dto: CreateHospitalizationDto) {
    return this.hospitalizationsService.create(dto);
  }

  // ── A CONTA DA INTERNACAO (construcao B, 17/09/2026) ────────────────────────────────
  // Porta unica de lancar, editar e apagar item: carimba a data, barra o lancamento repetido e
  // atualiza a venda do dia NA HORA (antes, so quando alguem abria a ficha).
  @Post(':id/conta')
  @ApiOperation({ summary: 'Lançar item na conta da internação (atualiza a venda do dia na hora)' })
  lancarNaConta(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.hospitalizationsService.lancarNaConta(id, body, userId);
  }

  @Patch(':id/conta/:itemId')
  @ApiOperation({ summary: 'Editar item da conta da internação' })
  editarNaConta(@Param('id') id: string, @Param('itemId') itemId: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.hospitalizationsService.editarNaConta(id, itemId, body, userId);
  }

  @Delete(':id/conta/:itemId')
  @ApiOperation({ summary: 'Apagar item da conta da internação' })
  apagarDaConta(@Param('id') id: string, @Param('itemId') itemId: string, @CurrentUser('id') userId: string) {
    return this.hospitalizationsService.apagarDaConta(id, itemId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar internação por ID' })
  get(@Param('id') id: string) {
    return this.hospitalizationsService.getById(id);
  }

  /** Os dias que ainda nao viraram comanda. */
  @Get(':id/dias-abertos')
  diasAbertos(@Param('id') id: string) {
    return this.hospitalizationsService.diasAbertos(id);
  }

  /** Fecha um dia: cria a venda daquele dia no caixa e marca o que entrou. */
  @Post(':id/fechar-dia')
  fecharDia(@Param('id') id: string, @Body() body: { dia: string }, @CurrentUser('id') userId: string) {
    return this.hospitalizationsService.fecharDia(id, body?.dia, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar internação' })
  update(@Param('id') id: string, @Body() dto: UpdateHospitalizationDto, @CurrentUser() user: any) {
    return this.hospitalizationsService.update(id, dto, user?.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir internação (deleta appointment)' })
  remove(@Param('id') id: string) {
    return this.hospitalizationsService.remove(id);
  }
}
