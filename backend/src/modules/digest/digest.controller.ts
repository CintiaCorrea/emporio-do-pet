import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DigestService } from './digest.service';

@Controller('digest')
export class DigestController {
  constructor(private readonly digest: DigestService) {}

  // Dispara o resumo AGORA (para testar / enviar sob demanda). Protegido.
  @UseGuards(JwtAuthGuard)
  @Post('enviar-agora')
  enviar() {
    return this.digest.enviar();
  }
}
