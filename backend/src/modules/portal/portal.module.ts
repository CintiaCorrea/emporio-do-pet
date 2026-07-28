import { Module } from '@nestjs/common';
import { PortalAuthController, PortalMeController } from './portal-auth.controller';
import { PortalAuthService } from './portal-auth.service';
import { PortalEscopoService } from './portal-escopo.service';
import { PortalWhatsappService } from './portal-whatsapp.service';
import { PortalTutorGuard } from './portal-tutor.guard';

/**
 * Modulo PORTAL DO TUTOR (PTL) — o app do cliente.
 *
 * Cômodo proprio, como o financeiro:
 *   · tabelas `ptl_` (so sessao, codigo e rastro de acesso)
 *   · rotas `/api/portal/*`
 *   · LE do CRM sempre pelo PortalEscopoService (filtrado por tutor) e nao
 *     escreve nada la dentro nesta fatia.
 *
 * SQL em prisma/portal/01-fundacao.sql. Nao usar `prisma db push`.
 */
@Module({
  controllers: [PortalAuthController, PortalMeController],
  providers: [PortalAuthService, PortalEscopoService, PortalWhatsappService, PortalTutorGuard],
  exports: [PortalAuthService, PortalEscopoService],
})
export class PortalModule {}
