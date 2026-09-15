import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ErrosTelaService } from './erros-tela.service';

@ApiTags('erros-tela')
@Controller('erros-tela')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ErrosTelaController {
  constructor(private readonly service: ErrosTelaService) {}

  /**
   * A tela avisa que quebrou. Quem é a pessoa vem do TOKEN, não do corpo: o navegador não
   * precisa (nem deve) escolher em nome de quem registra um erro.
   */
  @Post()
  registrar(
    @Body() body: { mensagem?: string; tela?: string; detalhe?: string },
    @CurrentUser('id') userId: string,
    @CurrentUser('name') userNome: string,
  ) {
    return this.service.registrar({ ...body, userId, userNome });
  }

  @Get()
  listar(@Query('dia') dia?: string) {
    return this.service.listar(dia);
  }
}
