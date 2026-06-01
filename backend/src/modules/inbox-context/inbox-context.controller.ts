import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InboxContextService } from './inbox-context.service';

@ApiTags('inbox-context')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inbox/context')
export class InboxContextController {
  constructor(private readonly service: InboxContextService) {}

  // Lookup unificado por telefone — retorna 1 resultado consolidado
  @Get('lookup')
  lookup(@Query('phone') phone?: string, @Query('search') search?: string) {
    return this.service.lookup({ phone, search });
  }

  // Buscar lista de profissionais pra dropdown "Encaminhar para quem?"
  @Get('staff')
  staff() {
    return this.service.staffList();
  }

  // Encaminhar contato pra outro usuário
  @Post('forward')
  forward(@Body() body: { tutorId?: string; leadId?: string; toUserId: string; observacao?: string }) {
    return this.service.forward(body);
  }

  // Resolver — marca conversa como atendida + cria interação
  @Post('resolve')
  resolve(@Body() body: { tutorId?: string; leadId?: string; texto?: string }) {
    return this.service.resolve(body);
  }
}
