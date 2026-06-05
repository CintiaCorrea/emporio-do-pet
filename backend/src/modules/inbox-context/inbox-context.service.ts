import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function onlyDigits(s?: string): string { return (s || '').replace(/\D/g, ''); }
function last9(s: string): string { return s.length > 9 ? s.slice(-9) : s; }

@Injectable()
export class InboxContextService {
  constructor(private prisma: PrismaService) {}

  async lookup(params: { phone?: string; search?: string }) {
    const raw = params.phone || params.search || '';
    const digits = onlyDigits(raw);
    const tail = last9(digits);

    if (!raw || raw.length < 2) {
      return { tutors: [], leads: [], unified: null };
    }

    const tutors = digits
      ? await this.prisma.tutor.findMany({
          where: { contacts: { some: { number: { contains: tail } } } },
          include: { contacts: true, pets: { take: 10 } },
          take: 5,
        })
      : await this.prisma.tutor.findMany({
          where: {
            OR: [
              { name: { contains: raw, mode: 'insensitive' as const } },
              { email: { contains: raw, mode: 'insensitive' as const } },
            ],
          },
          include: { contacts: true, pets: { take: 10 } },
          take: 5,
        });

    const leads = digits
      ? await this.prisma.lead.findMany({
          where: { phone: { contains: tail } },
          take: 5,
        })
      : await this.prisma.lead.findMany({
          where: {
            OR: [
              { name: { contains: raw, mode: 'insensitive' as const } },
              { email: { contains: raw, mode: 'insensitive' as const } },
            ],
          },
          take: 5,
        });

    // Unificar — se há Tutor com mesmo telefone, ele é o canônico
    // O Lead vira "histórico" referenciado pelo Tutor
    let unified: any = null;
    if (tutors.length > 0) {
      const tutor = tutors[0];
      const tutorPhones = tutor.contacts.map((c) => last9(onlyDigits(c.number)));
      const linkedLead = leads.find((l) =>
        tutorPhones.includes(last9(onlyDigits(l.phone || '')))
      );
      unified = {
        kind: 'TUTOR',
        tutor,
        lead: linkedLead || null, // histórico
      };
    } else if (leads.length > 0) {
      unified = { kind: 'LEAD', tutor: null, lead: leads[0] };
    }

    return { tutors, leads, unified };
  }

  async staffList() {
    const users = await this.prisma.user.findMany({
      where: { isApproved: true, isBlocked: false },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
      take: 50,
    });
    return users;
  }

  async forward(body: { tutorId?: string; leadId?: string; toUserId: string; observacao?: string }) {
    if (!body.toUserId) return { ok: false, error: 'toUserId required' };
    const user = await this.prisma.user.findUnique({ where: { id: body.toUserId } });
    if (!user) return { ok: false, error: 'user not found' };

    // Criar interação tipo ENCAMINHAMENTO
    const interacao = await (this.prisma as any).interacao.create({
      data: {
        tipo: 'ENCAMINHAMENTO',
        texto: `Encaminhado para ${user.name}${body.observacao ? ': ' + body.observacao : ''}`,
        tutorId: body.tutorId || null,
        leadId: body.leadId || null,
        canal: 'Sistema',
      },
    });

    return { ok: true, interacaoId: interacao.id, forwardedTo: { id: user.id, name: user.name } };
  }

  async resolve(body: { tutorId?: string; leadId?: string; texto?: string }) {
    const txt = body.texto || `Conversa resolvida em ${new Date().toLocaleString('pt-BR')}`;
    const interacao = await (this.prisma as any).interacao.create({
      data: {
        tipo: 'RESOLVIDO',
        texto: txt,
        tutorId: body.tutorId || null,
        leadId: body.leadId || null,
        canal: 'Sistema',
      },
    });

    // Nao atualiza lastActivityAt: a Caixa de Entrada compara o horario da
    // resolucao com a ultima atividade pra decidir se o item ainda aparece.

    return { ok: true, interacaoId: interacao.id };
  }
}
