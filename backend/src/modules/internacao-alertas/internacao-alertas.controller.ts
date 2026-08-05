import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InternacaoAlertasService } from './internacao-alertas.service';

@ApiTags('internacao-alertas')
@Controller('internacao-alertas')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InternacaoAlertasController {
  constructor(private readonly service: InternacaoAlertasService) {}

  @Get('proximos')
  proximos(@Query('janela') janela?: string) {
    const j = janela ? parseInt(janela, 10) : 18;
    return this.service.proximos(isNaN(j) ? 18 : j);
  }
}
