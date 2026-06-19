import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleAdsConversionService } from './google-ads-conversion.service';

/**
 * Fase 4 — quando um cliente (Tutor) é criado no CRM, dispara a conversão
 * offline pro Google Ads. Listener isolado: não altera o fluxo de cadastro
 * existente, só escuta o evento `crm.tutor.created` que o CRM já emite.
 */
@Injectable()
export class GoogleAdsConversionListener {
  private readonly logger = new Logger(GoogleAdsConversionListener.name);

  constructor(
    private prisma: PrismaService,
    private conversions: GoogleAdsConversionService,
  ) {}

  @OnEvent('crm.tutor.created')
  async onTutorCreated(data: { tutorId: string; convertedFromLeadId?: string }): Promise<void> {
    try {
      const tutor = await this.prisma.tutor.findUnique({
        where: { id: data.tutorId },
        include: { contacts: { where: { isPrimary: true }, take: 1 } },
      });
      if (!tutor) return;
      await this.conversions.uploadClientConversion({
        email: tutor.email,
        phone: tutor.contacts[0]?.number ?? null,
      });
    } catch (e: any) {
      this.logger.warn(`Listener de conversão Google Ads falhou: ${e?.message || e}`);
    }
  }
}
