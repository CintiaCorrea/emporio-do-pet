import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { TutorStatus } from '@prisma/client';
import { CreateTutorDto } from './dto/create-tutor.dto';
import { UpdateTutorDto } from './dto/update-tutor.dto';
import { normalizePhone, last9 } from '../../common/phone';
import { proximoCodigo, isColisaoCodigo } from '../../common/codigo';

@Injectable()
export class TutorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createTutorDto: CreateTutorDto) {
// === Normalize + dedupe por ultimos 9 digitos ===
    const phones = (createTutorDto.contacts || []).map(c => last9(c.number)).filter(p => p && p.length >= 8);
    if (phones.length > 0) {
      const existing = await this.prisma.tutor.findFirst({
        where: {
          contacts: {
            some: {
              number: { contains: phones[0] },
            },
          },
        },
        include: { contacts: true, pets: true },
      });
      if (existing) return existing; // 2b: retorna existente
      // Normaliza os contatos antes de criar
      if (createTutorDto.contacts) {
        createTutorDto.contacts = createTutorDto.contacts.map(c => ({ ...c, number: normalizePhone(c.number) }));
      }
    }
    // === Dedupe por CPF (SO DIGITOS — evita duplicado por formato "111.x" vs "111x") ===
    const cpfDigits = ((createTutorDto as any).cpf || '').replace(/\D/g, '');
    if (cpfDigits.length >= 11) {
      const existingCpf = await this.prisma.tutor.findFirst({
        where: { cpf: cpfDigits },
        include: { contacts: true, pets: true },
      });
      if (existingCpf) return existingCpf; // ja existe cliente com esse CPF -> usa o existente
      (createTutorDto as any).cpf = cpfDigits; // guarda sempre normalizado
    }
    const { contacts, ...tutorData } = createTutorDto as any;

    const contactCreates = Array.isArray(contacts)
      ? contacts
          .filter((c: any) => typeof c?.number === 'string' && c.number.trim().length > 0)
          .map((c: any) => ({
            type: c.type || 'MOBILE',
            number: c.number.trim(),
            isWhatsApp: c.isWhatsApp ?? false,
            observations: c.observations || undefined,
            isPrimary: c.isPrimary ?? false,
          }))
      : [];

    if (contactCreates.length === 0) {
      throw new BadRequestException('Pelo menos um contato com número é necessário');
    }

    // Garantir que exista exatamente 1 contato primário
    const firstPrimaryIndex = contactCreates.findIndex((c) => c.isPrimary === true);
    if (firstPrimaryIndex === -1) {
      contactCreates[0].isPrimary = true;
    } else {
      contactCreates.forEach((c, idx) => {
        c.isPrimary = idx === firstPrimaryIndex;
      });
    }

    let tutor: any;
    for (let tentativa = 0; ; tentativa++) {
      try {
        tutor = await this.prisma.tutor.create({
          data: {
            ...tutorData,
            codigo: await proximoCodigo(this.prisma, 'tutor'),
            contacts: {
              create: contactCreates,
            },
          },
          include: {
            contacts: true,
            pets: true,
          },
        });
        break;
      } catch (e) {
        if (isColisaoCodigo(e) && tentativa < 4) continue;
        throw e;
      }
    }

    // Emit tutor created event for automations
    // Note: userId would need to be passed from controller if multi-tenant
    const primaryContact = tutor.contacts.find((c: { isPrimary: boolean }) => c.isPrimary);
    this.eventsService.emitTutorCreated('system', {
      tutorId: tutor.id,
      name: tutor.name,
      email: tutor.email || undefined,
      phone: primaryContact?.number,
    });

    return tutor;
  }

  async findAll(params?: { search?: string; skip?: number; take?: number }) {
    const { search } = params || {};
    // skip/take chegam da URL como TEXTO ("6", não 6) e o Prisma recusa Int em String —
    // qualquer chamada com ?take= dava 500. Os autocompletes de cliente (PDV, agenda,
    // nova conversa, cadastros recebidos) mandam take e estavam todos quebrados calados:
    // o front lia a resposta de erro, não achava a lista e mostrava "nenhum resultado".
    const skip = Number.isFinite(Number(params?.skip)) ? Math.max(0, Number(params?.skip)) : 0;
    const take = Number.isFinite(Number(params?.take)) && Number(params?.take) > 0
      ? Math.min(200, Number(params?.take))
      : 20;

    // Normaliza telefone (remove não-dígitos) e usa últimos 9 dígitos
    // pra casar com qualquer formato (5585xxx ou 85xxx)
    const onlyDigits = search ? search.replace(/\D/g, '') : '';
    const tail9 = onlyDigits.length > 9 ? onlyDigits.slice(-9) : onlyDigits;
    const where = search
      ? {
          OR: /^\d{1,6}$/.test(search.trim())
            ? [
                // Termo e um numero curto -> busca por CODIGO (e telefone se 4+ digitos)
                { codigo: Number(search.trim()) },
                ...(onlyDigits.length >= 4 ? [{ contacts: { some: { number: { contains: tail9 } } } }] : []),
              ]
            : [
                // Termo com letras -> nome / email / CPF / telefone / NOME DO PET
                { name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
                { cpf: { contains: search } },
                // Achar o dono pelo nome do bicho: quem atende lembra "a Luna", não "a Cláudia".
                // Só entra no ramo de LETRAS — busca por telefone (usada na checagem de
                // duplicidade) continua idêntica, sem risco de casar com nome de pet.
                { pets: { some: { name: { contains: search, mode: 'insensitive' as const } } } },
                ...(onlyDigits.length >= 4 ? [{ contacts: { some: { number: { contains: tail9 } } } }] : []),
              ],
        }
      : {};

    const [tutors, total] = await Promise.all([
      this.prisma.tutor.findMany({
        where,
        skip,
        take,
        include: {
          contacts: true,
          pets: true,
          _count: {
            select: { appointments: true },
          },
        },
        // Ordem alfabética por nome (antes vinha por data de cadastro, o que bagunçava
        // a busca e as listas de tutor).
        orderBy: { name: 'asc' },
      }),
      this.prisma.tutor.count({ where }),
    ]);

    return { tutors, total, skip, take };
  }

  // Lista leve para a tela de Clientes (evita puxar todos os campos + contatos + agendamentos de ~3.6k tutores)
  async listaSimples() {
    return this.prisma.tutor.findMany({
      select: {
        id: true, name: true, codigo: true, status: true, estadoRelacionamento: true,
        classificacao: true, // etiqueta (Cliente/Fornecedor/Profissional) — reconhecida no inbox
        email: true, // a tela de Clientes oferece busca por e-mail; sem isso ela falha calada
        birthDate: true, proximoFollowupAt: true, rankingAbc: true,
        contacts: { take: 1, orderBy: { isPrimary: 'desc' }, select: { number: true, isPrimary: true } },
        pets: { select: { id: true, name: true, species: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Reclassifica um CLIENTE (Tutor) de volta pra LEAD. Usado pra limpar os
   * "clientes-fantasma" (contato que entrou como cliente sem ser). PROTEÇÃO:
   * só permite se NÃO tiver pet nem atendimento (senão é cliente real, não mexe).
   * Move as interações pro lead (preserva histórico) e remove o cadastro fantasma.
   */
  async reclassifyAsLead(id: string) {
    const tutor = await this.prisma.tutor.findUnique({
      where: { id },
      include: {
        contacts: { orderBy: { isPrimary: 'desc' }, take: 1 },
        _count: { select: { pets: true, appointments: true } },
      },
    });
    if (!tutor) throw new NotFoundException('Cliente não encontrado');
    if (tutor._count.pets > 0 || tutor._count.appointments > 0) {
      throw new BadRequestException(
        'Este cliente tem pets ou atendimentos — não dá para reclassificar como lead.',
      );
    }
    const phone = tutor.contacts[0]?.number || '';
    const phoneDigits = phone.replace(/\D/g, '');
    const emailReal =
      tutor.email &&
      tutor.email.includes('@') &&
      !tutor.email.includes('@emporiodopet.crm') &&
      !tutor.email.includes('@whatsapp.lead')
        ? tutor.email
        : `${phoneDigits || tutor.id}@whatsapp.lead`;

    // Reusa lead existente (mesmo email ou telefone) pra não violar o email único.
    let lead = await this.prisma.lead.findFirst({
      where: {
        OR: [
          { email: emailReal },
          ...(phoneDigits.length >= 8 ? [{ phone: { contains: phoneDigits.slice(-8) } }] : []),
        ],
      },
    });
    if (!lead) {
      lead = await this.prisma.lead.create({
        data: {
          name: tutor.name,
          phone: phone || null,
          email: emailReal,
          source: 'WHATSAPP' as any,
          sourceDetail: 'reclassificado_de_cliente',
          status: 'NEW' as any,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          lastActivityAt: new Date(),
        } as any,
      });
    }
    // Preserva histórico e desvincula conversas, depois remove o cadastro fantasma.
    await this.prisma.interacao.updateMany({ where: { tutorId: id }, data: { tutorId: null, leadId: lead.id } });
    await this.prisma.whatsAppConversation.updateMany({ where: { tutorId: id }, data: { tutorId: null } });
    await this.prisma.tutor.delete({ where: { id } });
    return { ok: true, leadId: lead.id };
  }

  async findById(id: string) {
    const tutor = await this.prisma.tutor.findUnique({
      where: { id },
      include: {
        contacts: true,
        pets: {
          include: {
            appointments: {
              take: 5,
              orderBy: { date: 'desc' },
            },
          },
        },
        appointments: {
          take: 10,
          orderBy: { date: 'desc' },
          include: {
            pet: true,
            user: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: {
            pets: true,
            contacts: true,
            appointments: true,
          },
        },
      },
    });

    if (!tutor) {
      throw new NotFoundException('Tutor não encontrado');
    }

    return tutor;
  }

  async update(id: string, updateTutorDto: UpdateTutorDto) {
    await this.findById(id);

    // Data no formato curto ("1986-08-29") — o que <input type="date"> produz — fazia o
    // Prisma estourar ("premature end of input") e virava 500 no cadastro. Aceitamos os
    // dois formatos aqui, na raiz, pra que NENHUMA tela precise lembrar de completar a hora.
    const data: any = { ...updateTutorDto };
    if (typeof data.birthDate === 'string') {
      const d = data.birthDate.slice(0, 10);
      data.birthDate = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00.000Z`) : (data.birthDate || null);
    }

    return this.prisma.tutor.update({
      where: { id },
      data,
      include: {
        contacts: true,
        pets: true,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);

    return this.prisma.tutor.delete({
      where: { id },
    });
  }

  // ============================================
  // Endpoints comerciais (portados de clients.service.ts)
  // Tutor.classificacao = 'Cliente' representa o antigo Client.
  // ============================================

  async getStats() {
    const [
      total,
      active,
      inactive,
      companies,
      individuals,
      fromLeads,
    ] = await Promise.all([
      this.prisma.tutor.count({ where: { classificacao: 'Cliente' } }),
      this.prisma.tutor.count({ where: { classificacao: 'Cliente', status: 'ACTIVE' } }),
      this.prisma.tutor.count({
        where: { classificacao: 'Cliente', status: { in: ['INACTIVE', 'CHURNED'] } },
      }),
      this.prisma.tutor.count({ where: { classificacao: 'Cliente', type: 'LEGAL_ENTITY' } }),
      this.prisma.tutor.count({ where: { classificacao: 'Cliente', type: 'INDIVIDUAL' } }),
      this.prisma.tutor.count({
        where: { classificacao: 'Cliente', convertedFromLeadId: { not: null } },
      }),
    ]);

    // TODO: totalRevenue/averageRevenue agora calculados via Appointments (sum por tutorId
    //       quando paymentStatus=PAID). Aggregate inline pesado — adicionar quando UI usar.
    return {
      total,
      active,
      inactive,
      companies,
      individuals,
      fromLeads,
      conversionRate: total > 0 ? ((fromLeads / total) * 100).toFixed(1) : '0',
      totalRevenue: 0,
      averageRevenue: 0,
    };
  }

  async updateStatus(id: string, status: TutorStatus) {
    const existing = await this.findById(id);
    const previousStatus = existing.status;

    const tutor = await this.prisma.tutor.update({
      where: { id },
      data: { status },
    });

    if (status !== previousStatus) {
      this.eventEmitter.emit('crm.tutor.status_changed', {
        tutorId: tutor.id,
        previousStatus,
        newStatus: status,
      });
    }

    return tutor;
  }

  async addTags(id: string, tags: string[]) {
    const existing = await this.findById(id);
    const newTags = [...new Set([...(existing.tags || []), ...tags])];

    return this.prisma.tutor.update({
      where: { id },
      data: { tags: newTags },
    });
  }

  async removeTags(id: string, tags: string[]) {
    const existing = await this.findById(id);
    const newTags = (existing.tags || []).filter((t) => !tags.includes(t));

    return this.prisma.tutor.update({
      where: { id },
      data: { tags: newTags },
    });
  }

  async recordPurchase(id: string, _amountCents: number) {
    // DEPRECATED: totalRevenue/totalOrders/lastOrderAt agora derivam de Appointments,
    // não de campos cacheados no Tutor. Este endpoint é um no-op kept for compat
    // até a UI migrar pra registrar Appointment diretamente.
    return this.findById(id);
  }

  // === Score do Cliente (4 dimensões, total 100) ===
  // Visitas: 30 pontos (1 ponto por atendimento, capped em 30)
  // LTV: 30 pontos (escala por valor total — R$ 100 = 10pt, capped 30)
  // Recência: 25 pontos (último atendimento — quanto mais recente, mais pontos)
  // NPS: 15 pontos (placeholder até módulo NPS estar pronto)
  async getScoreClient(tutorId: string) {
    const tutor = await this.prisma.tutor.findUnique({ where: { id: tutorId } });
    if (!tutor) return null;

    const appointments = await this.prisma.appointment.findMany({
      where: { tutorId },
      orderBy: { date: 'desc' },
    });

    const visitsScore = Math.min(30, appointments.length);
    const totalRevenue = 0; // TODO: calcular via Appointments quando tiver campo valor
    const ltvScore = Math.min(30, Math.floor(totalRevenue / 100));
    
    let recenciaScore = 0;
    if (appointments[0]) {
      const daysSince = Math.floor((Date.now() - new Date(appointments[0].date).getTime()) / 86400000);
      if (daysSince <= 30) recenciaScore = 25;
      else if (daysSince <= 90) recenciaScore = 18;
      else if (daysSince <= 180) recenciaScore = 10;
      else if (daysSince <= 365) recenciaScore = 5;
    }

    const npsScore = 0; // placeholder

    const total = visitsScore + ltvScore + recenciaScore + npsScore;
    const label = total >= 70 ? 'Ativo' : total >= 30 ? 'Acompanhando' : 'Inativo';

    return {
      total,
      label,
      dimensions: {
        visitas: { score: visitsScore, max: 30, value: appointments.length },
        ltv: { score: ltvScore, max: 30, value: totalRevenue },
        recencia: { score: recenciaScore, max: 25, value: appointments[0]?.date || null },
        nps: { score: npsScore, max: 15, value: null },
      },
    };
  }

  async findByIdExpanded(id: string) {
    const tutor = await this.findById(id);
    if (!tutor) return null;
    const score = await this.getScoreClient(id);
    return { ...tutor, score };
  }


  async profileStats(tutorId: string) {
    const tutor = await this.prisma.tutor.findUnique({ where: { id: tutorId } });
    if (!tutor) throw new NotFoundException('Tutor não encontrado');
    const now = new Date();
    const apps = await this.prisma.appointment.findMany({
      where: { tutorId },
      select: { id: true, date: true, value: true, status: true, paymentStatus: true, petId: true },
      orderBy: { date: 'desc' },
    });
    const pets = await this.prisma.pet.findMany({ where: { tutorId }, select: { id: true, name: true, species: true, status: true } });
    const realizadas = apps.filter(a => a.status === 'COMPLETED' || a.status === 'DONE' || a.date < now);
    const ultima = realizadas[0];
    const valorTotal = realizadas.reduce((s, a) => s + (a.value || 0), 0);
    const valorPago = realizadas.filter(a => a.paymentStatus === 'PAID').reduce((s, a) => s + (a.value || 0), 0);
    const valorAReceber = valorTotal - valorPago;

    // Frequência últimos 12 meses
    const freq: { mes: string; total: number; valor: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const apsDoMes = realizadas.filter(a => { const ad = new Date(a.date); return ad >= d && ad < next; });
      freq.push({ mes: d.toLocaleDateString('pt-BR', { month: 'short' }), total: apsDoMes.length, valor: +apsDoMes.reduce((s, a) => s + (a.value || 0), 0).toFixed(2) });
    }

    const diasDesdeUltima = ultima ? Math.floor((now.getTime() - new Date(ultima.date).getTime()) / 86400000) : null;
    const futurasAgendadas = apps.filter(a => new Date(a.date) >= now && a.status !== 'CANCELLED').length;

    // Share of wallet — divisao do valor gasto por marca de negocio (EMPORIO / MUNDO_A_PARTE / DRA_VIVIAN)
    const itens = await this.prisma.appointmentItem.findMany({
      where: { appointment: { tutorId } },
      select: { marca: true, valorTotal: true },
    });
    const marcaMap = new Map<string, number>();
    for (const it of itens) {
      const m = it.marca || 'EMPORIO';
      marcaMap.set(m, (marcaMap.get(m) || 0) + (it.valorTotal || 0));
    }
    const totalMarca = Array.from(marcaMap.values()).reduce((s, v) => s + v, 0);
    const porMarca = Array.from(marcaMap.entries())
      .map(([marca, valor]) => ({
        marca,
        valor: +valor.toFixed(2),
        pct: totalMarca > 0 ? Math.round((valor / totalMarca) * 100) : 0,
      }))
      .sort((a, b) => b.valor - a.valor);

    return {
      totalAppointments: realizadas.length,
      futurasAgendadas,
      diasDesdeUltima,
      valorTotal: +valorTotal.toFixed(2),
      valorPago: +valorPago.toFixed(2),
      valorAReceber: +valorAReceber.toFixed(2),
      ticketMedio: realizadas.length > 0 ? +(valorTotal / realizadas.length).toFixed(2) : 0,
      totalPets: pets.length,
      petsAtivos: pets.filter(p => p.status === 'ACTIVE').length,
      pets,
      frequenciaMensal: freq,
      porMarca,
    };
  }
}
