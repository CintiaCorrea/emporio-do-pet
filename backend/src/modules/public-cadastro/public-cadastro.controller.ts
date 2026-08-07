import { Body, Controller, Get, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Cadastro PÚBLICO do cliente (link genérico enviado ao tutor).
// SEM JwtAuthGuard = rota pública. Guarda como ListaItem (lista="cadastro_publico"),
// status PENDENTE — NÃO cria cliente automático; a equipe revisa/aprova depois (Fatia 4B).
@Controller('public')
export class PublicCadastroController {
  constructor(private readonly prisma: PrismaService) {}

  // Lista "Como conheceu" (Config › Listas, lista `origens`) — pública p/ o form de cadastro.
  @Get('origens')
  async origens() {
    const itens = await this.prisma.listaItem.findMany({ where: { lista: 'origens' } });
    const arr = itens
      .map((i) => {
        const v = (i.valor || '').trim();
        if (v.startsWith('{')) { try { const o = JSON.parse(v); return o.nome || o.valor || v; } catch { return v; } }
        return v;
      })
      .filter(Boolean);
    return { origens: arr };
  }

  @Post('cadastro')
  async criar(@Body() dto: any) {
    const payload = {
      status: 'PENDENTE',
      receivedAt: new Date().toISOString(),
      tutor: {
        name: (dto?.name || '').toString().trim(),
        cpf: (dto?.cpf || '').toString().trim(),
        birthDate: (dto?.birthDate || '').toString().trim(),
        cep: (dto?.cep || '').toString().trim(),
        address: (dto?.address || '').toString().trim(),
        phone: (dto?.phone || '').toString().trim(),
        email: (dto?.email || '').toString().trim(),
        howFoundUs: (dto?.howFoundUs || '').toString().trim(),
      },
      pet: {
        name: (dto?.petName || '').toString().trim(),
        species: (dto?.petSpecies || '').toString().trim(),
        birthDate: (dto?.petBirthDate || '').toString().trim(),
        breed: (dto?.petBreed || '').toString().trim(),
        age: (dto?.petAge || '').toString().trim(),
        weight: (dto?.petWeight || '').toString().trim(),
      },
      // Origem/UTM (lidos do link do formulário) — pra saber qual campanha trouxe o cadastro
      origem: {
        utmSource: (dto?.utmSource || '').toString().trim() || null,
        utmMedium: (dto?.utmMedium || '').toString().trim() || null,
        utmCampaign: (dto?.utmCampaign || '').toString().trim() || null,
        utmContent: (dto?.utmContent || '').toString().trim() || null,
        referrer: (dto?.referrer || '').toString().trim() || null,
        landingPage: (dto?.landingPage || '').toString().trim() || null,
      },
    };
    if (!payload.tutor.name || !payload.tutor.phone) {
      return { ok: false, message: 'Nome e telefone são obrigatórios.' };
    }
    const item = await this.prisma.listaItem.create({
      data: { lista: 'cadastro_publico', valor: JSON.stringify(payload) },
    });

    // Opção A: se o telefone bate com um AGENDAMENTO FUTURO de um cliente já existente,
    // confirma sozinho (a ficha do cliente ainda passa pela aprovação em Cadastros recebidos).
    // Best-effort: qualquer falha aqui não pode quebrar o cadastro.
    try {
      const last8 = payload.tutor.phone.replace(/\D/g, '').slice(-8);
      if (last8) {
        const contato = await this.prisma.contact.findFirst({
          where: { number: { contains: last8 } },
          select: { tutorId: true },
        });
        if (contato?.tutorId) {
          // Hoje 00:00 em Fortaleza (UTC-3) = 03:00 UTC — só agendamentos de hoje pra frente.
          const fAgora = new Date(Date.now() - 3 * 3600 * 1000);
          const inicioHoje = new Date(Date.UTC(fAgora.getUTCFullYear(), fAgora.getUTCMonth(), fAgora.getUTCDate(), 3, 0, 0));
          const appt = await this.prisma.appointment.findFirst({
            where: { tutorId: contato.tutorId, date: { gte: inicioHoje }, status: { notIn: ['Cancelado', 'Atendido'] } },
            orderBy: { date: 'asc' },
            select: { id: true, confirmacaoStatus: true },
          });
          if (appt && appt.confirmacaoStatus !== 'CONFIRMADO') {
            await this.prisma.appointment.update({
              where: { id: appt.id },
              data: { confirmacaoStatus: 'CONFIRMADO', status: 'Confirmado' },
            });
          }
        }
      }
    } catch { /* confirmação automática é best-effort */ }

    return { ok: true, id: item.id };
  }
}
