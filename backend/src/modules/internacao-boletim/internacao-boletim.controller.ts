import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InternacaoBoletimScheduler } from './internacao-boletim.scheduler';

// Gatilho manual do envio dos boletins de internação programados (o mesmo que roda
// a cada 10 min). Idempotente: a trava `intbolprog_sent` impede reenvio no mesmo dia.
@UseGuards(JwtAuthGuard)
@Controller('internacao-boletim')
export class InternacaoBoletimController {
  constructor(private readonly scheduler: InternacaoBoletimScheduler) {}

  @Post('rodar-agora')
  async rodar() {
    await this.scheduler.rodar();
    return { ok: true };
  }
}
