import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RemindersScheduler } from './reminders.scheduler';

// Gatilho manual dos lembretes (o mesmo que roda às 9h). Idempotente: a trava
// `reminder_sent` impede reenvio. Usado pra testar/rodar o lote do dia na mão.
@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private readonly scheduler: RemindersScheduler) {}

  @Post('rodar-agora')
  async rodar() {
    await this.scheduler.diario();
    return { ok: true };
  }
}
