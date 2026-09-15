/**
 * Quem está usando o portal — rota da EQUIPE (/api/portal/admin/uso).
 *
 * Guard de FUNCIONÁRIO (JwtAuthGuard), não o do tutor: esta lista fala de todos os clientes e
 * não pode ser alcançada com sessão de tutor. Mesmo cuidado do PortalAdminController.
 */
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortalUsoService } from './portal-uso.service';

@UseGuards(JwtAuthGuard)
@Controller('portal/admin/uso')
export class PortalUsoController {
  constructor(private readonly uso: PortalUsoService) {}

  @Get()
  listar() {
    return this.uso.listar();
  }
}
