/**
 * Rotas da dieta — /api/dietas/*  (login de FUNCIONARIO).
 * Quem prescreve e a equipe; o portal tem rota propria, so de leitura.
 */
import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DietasService, DietaPayload } from './dietas.service';

interface ReqComUsuario {
  user?: { id?: string; name?: string; email?: string };
}

@UseGuards(JwtAuthGuard)
@Controller('dietas')
export class DietasController {
  constructor(private readonly dietas: DietasService) {}

  @Get('pet/:petId')
  async doPet(@Param('petId') petId: string) {
    return this.dietas.doPet(petId);
  }

  @Post('pet/:petId')
  async prescrever(
    @Param('petId') petId: string,
    @Body() corpo: DietaPayload,
    @Req() req: ReqComUsuario,
  ) {
    return this.dietas.prescrever(petId, {
      ...corpo,
      prescritorNome: corpo?.prescritorNome || req?.user?.name || null,
      prescritorUserId: corpo?.prescritorUserId || req?.user?.id || null,
    });
  }

  @Patch(':id')
  async ajustar(@Param('id') id: string, @Body() corpo: DietaPayload) {
    return this.dietas.ajustar(id, corpo);
  }

  @Patch(':id/encerrar')
  async encerrar(@Param('id') id: string) {
    return this.dietas.encerrar(id);
  }
}
