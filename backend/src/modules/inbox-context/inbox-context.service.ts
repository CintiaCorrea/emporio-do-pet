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

  async forward(body: { tutorId?: string; leadId?: string; toUserId: string; observacao?: string; fromUserId?: string }) {
    if (!body.toUserId) return { ok: false, error: 'toUserId required' };
    const user = await this.prisma.user.findUnique({ where: { id: body.toUserId } });
    if (!user) return { ok: false, error: 'user not found' };

    // Nome do contato (p/ a nota) + telefone (p/ achar a conversa se for lead)
    let nome = 'contato';
    let p8 = '';
    if (body.tutorId) {
      const t = await this.prisma.tutor.findUnique({
        where: { id: body.tutorId },
        select: { name: true, contacts: { select: { number: true }, orderBy: { isPrimary: 'desc' }, take: 1 } },
      });
      nome = t?.name || nome;
      p8 = t?.contacts?.[0]?.number ? last9(onlyDigits(t.contacts[0].number)).slice(-8) : '';
    } else if (body.leadId) {
      const l = await this.prisma.lead.findUnique({ where: { id: body.leadId }, select: { name: true, phone: true } });
      nome = l?.name || nome;
      p8 = l?.phone ? last9(onlyDigits(l.phone)).slice(-8) : '';
    }

    // 1) Registro do encaminhamento
    const interacao = await (this.prisma as any).interacao.create({
      data: {
        tipo: 'ENCAMINHAMENTO',
        texto: `Encaminhado para ${user.name}${body.observacao ? ': ' + body.observacao : ''}`,
        tutorId: body.tutorId || null,
        leadId: body.leadId || null,
        canal: 'Sistema',
      },
    });

    // 2) REATRIBUI a(s) conversa(s) do Meta pro destinatário (responsável = assignedUserId)
    try {
      if (body.tutorId) {
        await (this.prisma as any).whatsAppConversation.updateMany({
          where: { tutorId: body.tutorId },
          data: { assignedUserId: body.toUserId, humanTakeoverAt: new Date() },
        });
      }
      if (p8.length >= 8) {
        await (this.prisma as any).whatsAppConversation.updateMany({
          where: { contactPhone: { endsWith: p8 } },
          data: { assignedUserId: body.toUserId, humanTakeoverAt: new Date() },
        });
      }
    } catch {
      /* reatribuição best-effort */
    }

    // 3) Avisa o destinatário (nota interna — aparece na aba "Internas")
    try {
      if (body.fromUserId) {
        await (this.prisma as any).internalNote.create({
          data: {
            fromUserId: body.fromUserId,
            toUserId: body.toUserId,
            content: `📨 Conversa de "${nome}" encaminhada para você${body.observacao ? ': ' + body.observacao : ''}.`,
          },
        });
      }
    } catch {
      /* nota best-effort */
    }

    return { ok: true, interacaoId: interacao.id, forwardedTo: { id: user.id, name: user.name } };
  }

  async resolve(body: { tutorId?: string; leadId?: string; texto?: string; phone?: string }) {
    const tutorId = body.tutorId || null;
    const leadId = body.leadId || null;
    const obs = (body.texto || '').trim();

    // MARCA INVISÍVEL de "resolvido" — é o que faz a conversa sair da Caixa de Entrada.
    // Vive na tabela de listas (uma chave por tutor/lead), NÃO no histórico de interações.
    // Antes isso era uma interação "Conversa resolvida em..." que poluía a ficha do cliente
    // mesmo sem observação nenhuma. O horário da resolução = updatedAt desta marca.
    const key = tutorId ? `cli:${tutorId}` : leadId ? `lead:${leadId}` : null;
    if (key) {
      await (this.prisma as any).listaItem
        .upsert({
          where: { lista_valor: { lista: 'inboxresolv', valor: key } },
          create: { lista: 'inboxresolv', valor: key },
          update: { ordem: { increment: 1 } }, // força o bump do updatedAt (= resolveu agora)
        })
        .catch(() => undefined);
    }

    // Interação SÓ quando há observação de verdade. Sem observação, foi resolvido de outra
    // forma e não precisa de nota na ficha (pedido da Cintia).
    let interacao: any = null;
    if (obs && (tutorId || leadId)) {
      interacao = await (this.prisma as any).interacao.create({
        data: { tipo: 'RESOLVIDO', texto: obs, tutorId, leadId, canal: 'Sistema' },
      });
    }

    // Nao atualiza lastActivityAt: a Caixa de Entrada compara o horario da
    // resolucao com a ultima atividade pra decidir se o item ainda aparece.

    // Box Meta-nativo: encerra a(s) conversa(s) do Meta desse contato (status CLOSED)
    // pra sumir da caixa e nao voltar (so reabre com mensagem nova). Nao bloqueia o resolve.
    try {
      if (tutorId) {
        await (this.prisma as any).whatsAppConversation.updateMany({
          where: { tutorId, status: 'OPEN' },
          data: { status: 'CLOSED' },
        });
        const t = await (this.prisma as any).tutor.findUnique({
          where: { id: tutorId },
          select: { contacts: { select: { number: true }, orderBy: { isPrimary: 'desc' }, take: 1 } },
        });
        const ph = t?.contacts?.[0]?.number
          ? String(t.contacts[0].number).replace(/\D/g, '').slice(-9)
          : '';
        if (ph.length >= 8) {
          await (this.prisma as any).whatsAppConversation.updateMany({
            where: { contactPhone: { endsWith: ph.slice(-8) }, status: 'OPEN' },
            data: { status: 'CLOSED' },
          });
        }
      }
      // Fecha TAMBÉM pelo telefone passado direto (conversa do Meta sem cliente/lead
      // vinculado — ex.: número ambíguo). Assim "Finalizar" fecha em qualquer caso.
      const ph2 = (body.phone || '').replace(/\D/g, '');
      if (ph2.length >= 8) {
        await (this.prisma as any).whatsAppConversation.updateMany({
          where: { contactPhone: { endsWith: ph2.slice(-8) }, status: 'OPEN' },
          data: { status: 'CLOSED' },
        });
      }
    } catch {
      /* se o Meta falhar, o resolve segue normal */
    }

    return { ok: true, interacaoId: interacao?.id || null };
  }
}
