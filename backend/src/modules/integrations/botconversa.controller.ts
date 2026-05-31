import { Body, Controller, HttpCode, Post, BadRequestException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

interface WebhookBody {
  subscriber_id?: string;
  phone?: string;
  resumo_ia?: string;
  atualizado_em?: string;
}

function onlyDigits(s?: string): string { return (s || '').replace(/\D/g, ''); }

@ApiTags('integrations')
@Controller('integrations/botconversa')
export class BotConversaController {
  constructor(private prisma: PrismaService) {}

  // BotConversa webhook → atualiza resumoIa no Tutor e/ou Lead com phone correspondente
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Body() body: WebhookBody) {
    if (!body || (!body.phone && !body.subscriber_id)) {
      throw new BadRequestException('phone or subscriber_id required');
    }
    const phoneDigits = onlyDigits(body.phone);
    const updatedAt = body.atualizado_em ? new Date(body.atualizado_em) : new Date();
    const resumo = body.resumo_ia ?? null;

    const tutors = phoneDigits
      ? await this.prisma.tutor.findMany({
          where: { contacts: { some: { number: { contains: phoneDigits } } } },
          select: { id: true },
        })
      : [];
    for (const t of tutors) {
      await this.prisma.tutor.update({ where: { id: t.id }, data: { resumoIa: resumo, resumoIaUpdatedAt: updatedAt } as any });
    }

    const leads = phoneDigits
      ? await this.prisma.lead.findMany({
          where: { phone: { contains: phoneDigits } },
          select: { id: true },
        })
      : [];
    for (const l of leads) {
      await this.prisma.lead.update({ where: { id: l.id }, data: { resumoIa: resumo, resumoIaUpdatedAt: updatedAt } as any });
    }

    return { ok: true, tutorsUpdated: tutors.length, leadsUpdated: leads.length };
  }
}
