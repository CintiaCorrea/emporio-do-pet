import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExamesService } from './exames.service';

@ApiTags('exames')
@Controller('exames')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExamesController {
  constructor(private readonly service: ExamesService) {}

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
