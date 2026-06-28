import { Body, Controller, Post } from '@nestjs/common';
import { SurveyAvaliacaoService } from './survey-avaliacao.service';

@Controller('survey-avaliacao')
export class SurveyAvaliacaoController {
  constructor(private readonly service: SurveyAvaliacaoService) {}

  // Disparado pelo botão "Enviar pesquisa no WhatsApp" do box.
  @Post('enviar')
  enviar(@Body() body: { tutorId: string }) {
    return this.service.enviarPesquisa(body?.tutorId);
  }
}
