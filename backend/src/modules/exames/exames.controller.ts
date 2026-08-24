import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExamesService } from './exames.service';

@ApiTags('exames')
@Controller('exames')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExamesController {
  constructor(private readonly service: ExamesService) {}

  /** FILA (Kanban): exames em andamento com pet/tutor/lab. */
  @Get('fila')
  fila() {
    return this.service.listarFila();
  }

  /** Move o exame de fase (drag no Kanban). */
  @Patch(':itemId/fase')
  mudarFase(@Param('itemId') itemId: string, @Body() body: { status: string }) {
    return this.service.mudarFase(itemId, body?.status);
  }

  /** Exclui um exame do Kanban. */
  @Delete(':itemId')
  excluir(@Param('itemId') itemId: string) {
    return this.service.excluir(itemId);
  }

  /** "Enviar agora": avisa o laboratório de um exame específico (id do listaItem petexa_). */
  @Post('avisar-lab/:itemId')
  avisarUm(@Param('itemId') itemId: string) {
    return this.service.avisarUm(itemId);
  }

  /** Gatilho manual do lote (mesma coisa que a cron das 11:30/17:00). */
  @Post('avisar-lab-rodar-agora')
  rodarAgora() {
    return this.service.avisarLaboratorios();
  }
}
