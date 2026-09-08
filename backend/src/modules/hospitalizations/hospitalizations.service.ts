import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardsService } from '../boards/boards.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { CreateHospitalizationDto } from './dto/create-hospitalization.dto';
import { UpdateHospitalizationDto } from './dto/update-hospitalization.dto';
import { diariasDevidas, diariasAFaturar } from './diaria.regras';
import { montarFechamento, diasEmAberto, acaoDaVendaDoDia, diaDe, dentroDaSemanaDeAjuste, type ItemDaConta } from './fechamento.regras';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface HospitalizationMetadata {
  type: 'HOSPITALIZATION';
  roomNumber?: string;
  dailyRate: number;
  // Diária vinda do catálogo — leva custo/margem pro DRE na comanda do dia.
  diariaServicoId?: string;
  diariaCatalogoItemId?: string;
  diariaCusto?: number;
  diariasFaturadas?: number;
  priority: Priority;
  estimatedDischargeDate?: string;
  actualDischargeDate?: string;
  diagnosis?: string;
  vitalSigns?: Record<string, any>;
  treatments?: Array<{ id: string; description: string; date: string; cost: number }>;
}

@Injectable()
export class HospitalizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardsService: BoardsService,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  // 📅 COMANDA DO DIA (Fatia 1): junta a(s) diária(s) ainda não faturada(s) + os itens abertos da conta
  // (medicações auto + manuais, exclui Insumo) numa VENDA nova (com número) que cai no "a pagar" do caixa.
  // 1 diária por dia (controla via metadata.diariasFaturadas). Marca os itens como baixados p/ não repetir.
  async gerarComandaDia(id: string, userId: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id }, select: { id: true, tutorId: true, petId: true, date: true, notes: true } });
    if (!appt) throw new NotFoundException('Internação não encontrada');
    const meta: any = this.parseMetadata(appt.notes);
    if (!meta) throw new BadRequestException('Este atendimento não é uma internação');

    // Diárias ainda não faturadas — 1 a cada 24 HORAS COMEÇADAS desde a entrada (regra
    // confirmada pela Cintia em 04/09: 25 h = 2 diárias).
    //
    // A CONTA PARA NA ALTA. Antes contava sempre até AGORA: um animal que teve alta no dia 1º
    // e cuja ficha fosse aberta no dia 10 aparecia com nove diárias a mais, e quem faturasse
    // naquele momento cobrava as nove. A conta mudava de valor sozinha, com o passar dos dias,
    // sem ninguém ter tocado nela.
    const admissao = new Date(appt.date);
    const alta = meta?.actualDischargeDate ? new Date(meta.actualDischargeDate).getTime() : null;
    const diasCorridos = diariasDevidas(admissao.getTime(), Date.now(), alta);
    const jaFaturadas = Number(meta.diariasFaturadas || 0);
    const diariasNovas = diariasAFaturar(diasCorridos, jaFaturadas);
    const dailyRate = Number(meta.dailyRate) || 0;

    // Itens abertos da conta (intconta_<id>) — não baixados e que não são Insumo.
    const contaRaw = await this.prisma.listaItem.findMany({ where: { lista: `intconta_${id}` } });
    const abertos = contaRaw
      .map((li) => { try { return { li, d: JSON.parse(li.valor) }; } catch { return null; } })
      .filter((x): x is { li: any; d: any } => !!x && !x.d.baixado && x.d.categoria !== 'Insumo');

    const items: any[] = [];
    if (diariasNovas > 0 && dailyRate > 0) {
      // Diária vinda do catálogo quando configurada (leva servicoId/produto + custo → margem no DRE); senão, item livre.
      items.push({ descricao: `Diária de internação${diariasNovas > 1 ? ` (${diariasNovas} dias)` : ''}`, quantidade: diariasNovas, valorUnitario: dailyRate, valorTotal: diariasNovas * dailyRate,
        servicoId: meta.diariaServicoId || undefined, catalogoItemId: meta.diariaCatalogoItemId || undefined,
        custoUnitario: meta.diariaCusto != null ? Number(meta.diariaCusto) : undefined });
    }
    for (const x of abertos) {
      const q = Number(x.d.quantidade) || 1; const vu = Number(x.d.valorUnitario) || 0;
      items.push({ descricao: x.d.descricao || 'Item', quantidade: q, valorUnitario: vu, valorTotal: q * vu,
        servicoId: x.d.servicoId || undefined, productId: x.d.productId || undefined,
        custoUnitario: x.d.custoUnitario != null ? Number(x.d.custoUnitario) : undefined,
        fornecedorId: x.d.fornecedorId || undefined });
    }
    if (!items.length) throw new BadRequestException('Nada novo para faturar hoje (sem diária pendente nem itens abertos).');

    const value = items.reduce((s, i) => s + Number(i.valorTotal), 0);
    // Reusa o fluxo de venda (numeroVenda + validação de servicoId + itens). type='Venda' e SEM notes de
    // internação → cai no "a pagar" do caixa (a exclusão de INTERNACAO olha as notes HOSPITALIZATION).
    const venda: any = await this.appointmentsService.create({
      tutorId: appt.tutorId, petId: appt.petId || undefined, userId,
      date: new Date().toISOString(), type: 'Venda', status: 'COMPLETED', value, items,
    } as any);

    // Marca os itens como faturados (não repetem) + registra as diárias faturadas.
    for (const x of abertos) {
      await this.prisma.listaItem.update({ where: { id: x.li.id }, data: { valor: JSON.stringify({ ...x.d, baixado: true, comandaId: venda.id, faturadoEm: new Date().toISOString() }) } }).catch(() => undefined);
    }
    meta.diariasFaturadas = jaFaturadas + diariasNovas;
    (meta as any).totalFaturado = Number((meta as any).totalFaturado || 0) + value; // acumulado da internação (p/ saldo)
    await this.prisma.appointment.update({ where: { id }, data: { notes: JSON.stringify(meta) } });

    const itensResumo = items.map((i) => ({ descricao: i.descricao, total: Number(i.valorTotal) }));
    return { ok: true, vendaId: venda.id, numeroVenda: venda.numeroVenda ?? null, diariasFaturadas: diariasNovas, itens: abertos.length, total: value, totalFaturado: (meta as any).totalFaturado, itensResumo };
  }

  /** Le a conta da internacao (listas intconta_<id>) ja com o id de cada linha. */
  private async lerConta(id: string): Promise<Array<ItemDaConta & { _listaId: string }>> {
    const raw = await this.prisma.listaItem.findMany({ where: { lista: `intconta_${id}` } });
    return raw
      .map((li) => { try { return { ...JSON.parse(li.valor), _listaId: li.id }; } catch { return null; } })
      .filter(Boolean) as any[];
  }

  /** Os dias que ainda nao viraram comanda — usado pela tela e pelo fechamento da meia-noite. */
  async diasAbertos(id: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id }, select: { id: true, date: true, notes: true } });
    if (!appt) throw new NotFoundException('Internação não encontrada');
    const meta: any = this.parseMetadata(appt.notes);
    if (!meta) throw new BadRequestException('Este atendimento não é uma internação');
    const itens = await this.lerConta(id);
    return {
      dias: diasEmAberto({
        itens, entrada: appt.date, ate: new Date(),
        diariaValor: Number(meta.dailyRate) || 0,
        diariasFaturadas: Number(meta.diariasFaturadas) || 0,
        diariasGeradas: !!meta?.vitalSigns?.diariasGeradas,
      }),
    };
  }

  /**
   * FECHA UM DIA da internacao: cria a venda daquele dia no caixa e marca o que entrou.
   *
   * Decisao da Cintia (05/09): na alta, COBRAR SO O QUE FALTA. Este metodo e o unico
   * caminho de cobranca da internacao daqui pra frente — a regra de o que entra mora em
   * fechamento.regras, com 36 testes, e nao e recalculada aqui.
   *
   * O que ja foi cobrado NAO volta: cada item vai marcado com 'baixado' e o numero da
   * venda. Era exatamente isso que faltava quando "Comanda do dia" e "Enviar pro Caixa"
   * se ignoravam e cobravam o cliente duas vezes.
   */
  /**
   * A CONTA DO DIA EM ABERTO E UMA VENDA EM ABERTO.
   *
   * Pedido da Cintia (07/09/2026): "e para puxar TODOS os lancamentos feitos na internacao. As
   * informacoes devem aparecer em TODOS os lugares. Venda por data."
   *
   * Antes, os lancamentos do dia so viravam venda quando alguem clicava "Fechar o dia" — ate la
   * eles nao existiam fora da internacao. Agora cada dia em aberto tem a sua venda, que segue os
   * lancamentos, e fechar o dia so trava a venda que ja existe.
   *
   * Roda na LEITURA da internacao de proposito: a tela grava item por quatro caminhos diferentes
   * (lancamento manual, cobranca automatica da prescricao, diaria automatica e o "editar o dia"),
   * e todos recarregam a internacao em seguida. Um ponto so de sincronismo erra menos que quatro
   * pontos de escrita — e pega tambem os caminhos que eu nao conheco.
   *
   * Nunca toca em dia que ja recebeu dinheiro nem em dia fechado. Falhar aqui nao pode derrubar
   * a ficha: a internacao abre do mesmo jeito, so nao sincroniza.
   */
  private async sincronizarVendasDosDiasAbertos(id: string, userId?: string): Promise<void> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      select: { id: true, tutorId: true, petId: true, date: true, notes: true, userId: true },
    });
    if (!appt?.tutorId) return;
    const meta: any = this.parseMetadata(appt.notes);
    if (!meta) return;

    const conta = await this.lerConta(id);
    const abertos = diasEmAberto({
      itens: conta,
      entrada: appt.date,
      ate: new Date(),
      diariaValor: Number(meta.dailyRate) || 0,
      diariasFaturadas: Number(meta.diariasFaturadas) || 0,
      diariasGeradas: !!meta?.vitalSigns?.diariasGeradas,
    });

    const vendas: Record<string, string> = { ...(meta.vendasDoDia || {}) };
    const diasComAlgo = new Set(abertos.map((f) => f.dia));
    // Dias que tinham venda e ficaram sem nada a cobrar entram na volta para serem apagados.
    for (const dia of Object.keys(vendas)) diasComAlgo.add(dia);

    let mudou = false;
    for (const dia of [...diasComAlgo].sort()) {
      const f = abertos.find((x) => x.dia === dia);
      const vendaId = vendas[dia] || null;

      let vendaRecebeu = false;
      let vendaSumiu = false;
      if (vendaId) {
        const v = await this.prisma.appointment.findUnique({
          where: { id: vendaId },
          select: { id: true, recebimentos: { select: { id: true }, take: 1 } },
        }).catch(() => null);
        if (!v) vendaSumiu = true;
        else vendaRecebeu = (v.recebimentos || []).length > 0;
      }
      // Venda apagada na mao (pelo caixa) nao volta sozinha: o registro dela sai do metadata.
      if (vendaSumiu) { delete vendas[dia]; mudou = true; continue; }

      const acao = acaoDaVendaDoDia({ temAlgoACobrar: !!f, vendaId, vendaRecebeu });
      if (acao === 'NADA') continue;

      if (acao === 'APAGAR') {
        await this.prisma.appointment.delete({ where: { id: vendaId as string } }).catch(() => undefined);
        delete vendas[dia];
        mudou = true;
        continue;
      }

      const items = this.itensDaVendaDoDia(f as any, dia, meta);
      const value = items.reduce((t, i) => t + Number(i.valorTotal || 0), 0);

      if (acao === 'CRIAR') {
        const nova: any = await this.appointmentsService.create({
          tutorId: appt.tutorId, petId: appt.petId || undefined, userId: userId || appt.userId || undefined,
          // A venda leva a data do DIA, nao a de agora — o faturamento fica no dia em que
          // o atendimento aconteceu.
          date: new Date(`${dia}T12:00:00-03:00`).toISOString(),
          type: 'Venda', status: 'COMPLETED', value, items,
        } as any).catch(() => null);
        if (nova?.id) { vendas[dia] = nova.id; mudou = true; }
      } else {
        await this.appointmentsService.update(vendaId as string, { value, items } as any).catch(() => undefined);
      }
    }

    if (mudou) {
      meta.vendasDoDia = vendas;
      await this.prisma.appointment.update({ where: { id }, data: { notes: JSON.stringify(meta) } }).catch(() => undefined);
    }
  }

  /** As linhas da venda de um dia: a diaria (quando devida) e os itens lancados naquele dia. */
  private itensDaVendaDoDia(f: any, dia: string, meta: any): any[] {
    const items: any[] = [];
    if (f?.diaria) {
      items.push({
        descricao: `Diária de internação — ${dia.slice(8)}/${dia.slice(5, 7)}`,
        quantidade: 1, valorUnitario: f.diaria.valor, valorTotal: f.diaria.valor,
        servicoId: meta.diariaServicoId || undefined,
        catalogoItemId: meta.diariaCatalogoItemId || undefined,
        custoUnitario: meta.diariaCusto != null ? Number(meta.diariaCusto) : undefined,
      });
    }
    for (const i of (f?.itens || []) as any[]) {
      const q = Number(i.quantidade) || 1, vu = Number(i.valorUnitario) || 0;
      items.push({
        descricao: i.descricao || 'Item', quantidade: q, valorUnitario: vu, valorTotal: q * vu,
        servicoId: i.servicoId || undefined,
        productId: i.productId || undefined,
        catalogoItemId: i.catalogoItemId || undefined,
        custoUnitario: i.custoUnitario != null ? Number(i.custoUnitario) : undefined,
        fornecedorId: i.fornecedorId || undefined,
      });
    }
    return items;
  }

  async fecharDia(id: string, dia: string, userId: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id }, select: { id: true, tutorId: true, petId: true, date: true, notes: true } });
    if (!appt) throw new NotFoundException('Internação não encontrada');
    const meta: any = this.parseMetadata(appt.notes);
    if (!meta) throw new BadRequestException('Este atendimento não é uma internação');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dia || ''))) throw new BadRequestException('Informe o dia no formato AAAA-MM-DD.');
    if (dia > (diaDe(new Date()) || '')) throw new BadRequestException('Não dá para fechar um dia que ainda não chegou.');

    const conta = await this.lerConta(id);
    const f = montarFechamento({
      itens: conta, dia, entrada: appt.date,
      diariaValor: Number(meta.dailyRate) || 0,
      diariasFaturadas: Number(meta.diariasFaturadas) || 0,
      diariasGeradas: !!meta?.vitalSigns?.diariasGeradas,
    });
    if (f.vazio) throw new BadRequestException(`Não há nada a cobrar em ${dia.slice(8)}/${dia.slice(5, 7)}.`);

    const items = this.itensDaVendaDoDia(f, dia, meta);
    const value = items.reduce((s, i) => s + Number(i.valorTotal), 0);

    // A venda do dia JA EXISTE — ela nasce no primeiro lancamento e segue a conta
    // (sincronizarVendasDosDiasAbertos). Fechar o dia nao cria outra: sincroniza pela ultima
    // vez e trava. Criar aqui de novo, como era ate 07/09/2026, cobraria o dia duas vezes.
    await this.sincronizarVendasDosDiasAbertos(id, userId);
    const metaAtual: any = this.parseMetadata(
      (await this.prisma.appointment.findUnique({ where: { id }, select: { notes: true } }))?.notes,
    ) || meta;
    meta.vendasDoDia = { ...(metaAtual.vendasDoDia || {}) };
    const vendaId = meta.vendasDoDia?.[dia];

    let venda: any = vendaId
      ? await this.prisma.appointment.findUnique({ where: { id: vendaId }, select: { id: true, numeroVenda: true } })
      : null;
    // Cinto de seguranca: se por qualquer motivo a venda do dia nao existir, cria agora — o
    // fechamento nunca pode deixar o dia sem cobranca.
    if (!venda) {
      venda = await this.appointmentsService.create({
        tutorId: appt.tutorId, petId: appt.petId || undefined, userId,
        date: new Date(`${dia}T12:00:00-03:00`).toISOString(),
        type: 'Venda', status: 'COMPLETED', value, items,
      } as any);
      meta.vendasDoDia[dia] = venda.id;
    }

    // Marca o que entrou. Falhar aqui seria pior que nao ter fechado: o item ficaria
    // cobrado na venda e livre na conta, pronto pra ser cobrado de novo.
    for (const i of f.itens as any[]) {
      await this.prisma.listaItem.update({
        where: { id: i._listaId },
        data: { valor: JSON.stringify({ ...i, _listaId: undefined, baixado: true, comandaId: venda.id, faturadoEm: new Date().toISOString() }) },
      }).catch(() => undefined);
    }
    if (f.diaria) meta.diariasFaturadas = Math.max(Number(meta.diariasFaturadas) || 0, f.diaria.indice + 1);
    (meta as any).totalFaturado = Number((meta as any).totalFaturado || 0) + value;
    await this.prisma.appointment.update({ where: { id }, data: { notes: JSON.stringify(meta) } });

    return { ok: true, dia, vendaId: venda.id, numeroVenda: venda.numeroVenda ?? null, itens: items.length, total: value };
  }

  private parseMetadata(notes: any): HospitalizationMetadata | null {
    try {
      if (!notes) return null;
      const parsed = typeof notes === 'string' ? JSON.parse(notes) : notes;
      if (parsed?.type === 'HOSPITALIZATION') return parsed as HospitalizationMetadata;
      return null;
    } catch {
      return null;
    }
  }

  private toHospitalization(appointment: any, metadata: HospitalizationMetadata) {
    const admissionDate = new Date(appointment.date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - admissionDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const treatmentsCost =
      appointment.treatments?.reduce((acc: number, t: any) => acc + t.cost, 0) || 0;
    const totalCost = metadata.dailyRate * diffDays + treatmentsCost + (appointment.value || 0);

    return {
      id: appointment.id,
      tutor: {
        id: appointment.tutor.id,
        name: appointment.tutor.name,
        phone: appointment.tutor.contacts?.[0]?.number,
      },
      pet: {
        id: appointment.pet.id,
        name: appointment.pet.name,
        species: appointment.pet.species,
        breed: appointment.pet.breed || undefined,
        age: appointment.pet.birthDate
          ? `${Math.floor((new Date().getTime() - new Date(appointment.pet.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} anos`
          : undefined,
      },
      veterinarian: appointment.user
        ? {
            id: appointment.user.id,
            name: appointment.user.name,
          }
        : undefined,
      admissionDate: appointment.date.toISOString(),
      estimatedDischargeDate: metadata.estimatedDischargeDate,
      actualDischargeDate: metadata.actualDischargeDate,
      reason: appointment.description || '',
      diagnosis: metadata.diagnosis,
      notes: typeof appointment.notes === 'string' ? appointment.notes : undefined,
      roomNumber: metadata.roomNumber,
      dailyRate: metadata.dailyRate,
      totalCost,
      status: appointment.status,
      priority: metadata.priority,
      vitalSigns: metadata.vitalSigns,
      treatments:
        metadata.treatments ||
        appointment.treatments?.map((t: any) => ({
          id: t.id,
          description: t.description,
          date: t.createdAt.toISOString(),
          cost: t.cost,
        })) ||
        [],
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
    };
  }

  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    priority?: string;
  }) {
    const { page = 1, limit = 100, search = '', status = '', priority = '' } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { description: { contains: search, mode: 'insensitive' as const } },
          { notes: { contains: search, mode: 'insensitive' as const } },
          { tutor: { name: { contains: search, mode: 'insensitive' as const } } },
          { pet: { name: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
    };

    const allAppointments = await this.prisma.appointment.findMany({
      where,
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            contacts: { where: { isPrimary: true }, take: 1 },
          },
        },
        pet: { select: { id: true, name: true, species: true, breed: true, birthDate: true } },
        user: { select: { id: true, name: true, email: true } },
        treatments: { select: { id: true, description: true, cost: true, createdAt: true } },
      },
      orderBy: { date: 'desc' },
    });

    const hospitalAppointments = allAppointments
      .map((apt: any) => ({ apt, metadata: this.parseMetadata(apt.notes) }))
      .filter((x: any) => x.metadata && x.metadata.type === 'HOSPITALIZATION');

    const total = hospitalAppointments.length;
    const paginated = hospitalAppointments.slice(skip, skip + limit);

    let hospitalizations = paginated.map(({ apt, metadata }: { apt: any; metadata: any }) =>
      this.toHospitalization(apt, metadata!),
    );

    if (priority && priority !== 'all') {
      hospitalizations = hospitalizations.filter((h: any) => h.priority === priority);
    }

    return {
      hospitalizations,
      pagination: {
        page,
        limit,
        total: hospitalizations.length,
        pages: Math.ceil(hospitalizations.length / limit),
      },
    };
  }

  async create(dto: CreateHospitalizationDto) {
    const metadata: HospitalizationMetadata = {
      type: 'HOSPITALIZATION',
      roomNumber: dto.roomNumber,
      dailyRate: dto.dailyRate,
      diariaServicoId: (dto as any).diariaServicoId,
      diariaCatalogoItemId: (dto as any).diariaCatalogoItemId,
      diariaCusto: (dto as any).diariaCusto,
      priority: (dto.priority as any) || 'MEDIUM',
      estimatedDischargeDate: dto.estimatedDischargeDate,
      diagnosis: dto.diagnosis,
      vitalSigns: dto.vitalSigns,
      treatments: [],
    };

    const appointment = await this.prisma.appointment.create({
      data: {
        tutorId: dto.tutorId,
        petId: dto.petId,
        userId: dto.userId,
        // A HORA DA ENTRADA manda, não a da digitação — é dela que saem as diárias.
        // Data inválida cai no agora, que é o comportamento antigo.
        date: (() => {
          const d = (dto as any).admissionAt ? new Date((dto as any).admissionAt) : null;
          return d && !Number.isNaN(d.getTime()) ? d : new Date();
        })(),
        duration: 0,
        description: dto.reason,
        notes: JSON.stringify(metadata),
        value: dto.dailyRate,
        status: 'ADMITTED',
        paymentStatus: 'PENDING',
      },
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            contacts: { where: { isPrimary: true }, take: 1 },
          },
        },
        pet: { select: { id: true, name: true, species: true, breed: true, birthDate: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Create card in Hospitalization board (async, don't block the response)
    const cardTitle = `${appointment.pet.name} - ${appointment.tutor.name}`;
    this.boardsService
      .createCardForAppointment(dto.userId, appointment.id, 'HOSPITALIZATION', cardTitle, 'Admissão')
      .catch((err) => console.error('Error creating hospitalization card:', err));

    // Retorna formato igual ao frontend
    return {
      id: appointment.id,
      tutor: {
        id: appointment.tutor.id,
        name: appointment.tutor.name,
        phone: appointment.tutor.contacts?.[0]?.number,
      },
      pet: {
        id: appointment.pet.id,
        name: appointment.pet.name,
        species: appointment.pet.species,
        breed: appointment.pet.breed || undefined,
        age: appointment.pet.birthDate
          ? `${Math.floor((new Date().getTime() - new Date(appointment.pet.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} anos`
          : undefined,
      },
      veterinarian: appointment.user
        ? { id: appointment.user.id, name: appointment.user.name }
        : undefined,
      admissionDate: appointment.date.toISOString(),
      estimatedDischargeDate: metadata.estimatedDischargeDate,
      reason: appointment.description || '',
      diagnosis: metadata.diagnosis,
      notes: dto.notes,
      roomNumber: metadata.roomNumber,
      dailyRate: metadata.dailyRate,
      totalCost: metadata.dailyRate,
      status: appointment.status,
      priority: metadata.priority,
      vitalSigns: metadata.vitalSigns,
      treatments: [],
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
    };
  }

  /**
   * GARANTE QUE CADA DIA TENHA A SUA DIARIA COMO ITEM DA CONTA.
   *
   * O padrao decidido com a Cintia: a diaria e um ITEM da comanda do dia, ao lado da
   * medicacao e dos exames — nao um numero solto somado por fora.
   *
   * Ate 06/09/2026 isso dependia de alguem clicar em "Gerar diarias por dia". A ficha da
   * Kate (que eu migrei a mao) seguia o padrao e as outras nao — foi ela quem notou:
   * "essa falta de padronizacao (...) dificulta e atrasa muito o trabalho".
   *
   * Botao pra fazer o que o sistema deveria fazer sozinho e trabalho empurrado pra quem
   * ja tem trabalho. Agora roda ao abrir a ficha, e e IDEMPOTENTE: so cria o que falta,
   * comparando pelo DIA — nunca duplica, nem as diarias que ja vieram das vendas antigas.
   */
  async garantirDiariasComoItens(id: string, entrada: Date, meta: any): Promise<number> {
    const valor = Number(meta?.dailyRate) || 0;
    if (valor <= 0) return 0; // sem valor nao se inventa cobranca — a tela avisa
    const comecadas = diariasDevidas(
      entrada.getTime(), Date.now(),
      meta?.actualDischargeDate ? new Date(meta.actualDischargeDate).getTime() : null,
    );
    const conta = await this.lerConta(id);
    const diasComDiaria = new Set(
      conta.filter((i: any) => i.categoria === 'Diária').map((i: any) => diaDe(i.at)).filter(Boolean),
    );
    let criadas = 0;
    for (let i = 0; i < comecadas; i++) {
      const quando = new Date(entrada.getTime() + i * 86_400_000);
      const dia = diaDe(quando);
      if (!dia || diasComDiaria.has(dia)) continue;
      const rot = `${dia.slice(8)}/${dia.slice(5, 7)}`;
      await this.prisma.listaItem.create({
        data: {
          lista: `intconta_${id}`,
          valor: JSON.stringify({
            descricao: `Diária de internação — ${rot}`,
            categoria: 'Diária', quantidade: 1, valorUnitario: valor,
            servicoId: '', productId: '', at: quando.toISOString(), baixado: false,
            ...(meta?.diariaCatalogoItemId ? { catalogoItemId: meta.diariaCatalogoItemId } : {}),
            ...(meta?.diariaCusto != null ? { custoUnitario: Number(meta.diariaCusto) } : {}),
            auto: true,
          }),
        },
      }).catch(() => undefined);
      diasComDiaria.add(dia);
      criadas++;
    }
    return criadas;
  }

  async getById(id: string) {
    // A conta do dia em aberto vira venda em aberto aqui. É o único ponto por onde todos os
    // caminhos de lançamento passam (a tela recarrega a internação depois de cada um), e é
    // best-effort de propósito: se a sincronização falhar, a ficha abre do mesmo jeito.
    await this.sincronizarVendasDosDiasAbertos(id).catch(() => undefined);

    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            contacts: { where: { isPrimary: true }, take: 1 },
          },
        },
        pet: { select: { id: true, name: true, species: true, breed: true, birthDate: true } },
        user: { select: { id: true, name: true, email: true } },
        treatments: { select: { id: true, description: true, cost: true, createdAt: true } },
      },
    });
    if (!appointment) throw new NotFoundException('Internação não encontrada');

    const metadata = this.parseMetadata(appointment.notes) || {
      type: 'HOSPITALIZATION',
      dailyRate: 0,
      priority: 'MEDIUM' as Priority,
    };

    // A diaria de cada dia vira ITEM da conta ao abrir a ficha. E o padrao da casa, e
    // depende do sistema, nao de alguem lembrar de clicar num botao. Falhar aqui nao pode
    // impedir a ficha de abrir — a conta e complemento, o prontuario e o principal.
    if ((metadata as any)?.type === 'HOSPITALIZATION') {
      await this.garantirDiariasComoItens(id, appointment.date, metadata).catch(() => 0);
    }

    return this.toHospitalization(appointment, metadata as HospitalizationMetadata);
  }

  async update(id: string, dto: UpdateHospitalizationDto, papel?: string) {
    const current = await this.prisma.appointment.findUnique({
      where: { id },
      include: { treatments: true },
    });
    if (!current) throw new NotFoundException('Internação não encontrada');

    let metadata: HospitalizationMetadata =
      this.parseMetadata(current.notes) ||
      ({
        type: 'HOSPITALIZATION',
        dailyRate: 0,
        priority: 'MEDIUM',
      } as HospitalizationMetadata);

    if (dto.roomNumber !== undefined) metadata.roomNumber = dto.roomNumber;
    if (dto.dailyRate !== undefined) metadata.dailyRate = dto.dailyRate;
    if (dto.priority !== undefined) metadata.priority = dto.priority as any;
    if (dto.estimatedDischargeDate !== undefined)
      metadata.estimatedDischargeDate = dto.estimatedDischargeDate;
    if (dto.actualDischargeDate !== undefined)
      metadata.actualDischargeDate = dto.actualDischargeDate;
    if (dto.diagnosis !== undefined) metadata.diagnosis = dto.diagnosis;
    if (dto.vitalSigns !== undefined) metadata.vitalSigns = dto.vitalSigns;
    // Espelha o status DENTRO do metadata (notes) — os alertas de internação leem daqui.
    // Sem isso, dar alta atualizava só a coluna e o alerta continuava disparando (bug 28/07).
    if (dto.status !== undefined) (metadata as any).status = dto.status;

    const updateData: any = {
      notes: JSON.stringify(metadata),
    };
    if (dto.reason !== undefined) updateData.description = dto.reason;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.dailyRate !== undefined) updateData.value = dto.dailyRate;
    // A HORA DE ENTRADA pode ser corrigida — e o relogio das diarias. Data invalida e
    // ignorada em silencio seria pior que recusar: a conta passaria a contar de 1970.
    if ((dto as any).admissionAt !== undefined) {
      // SEMANA DE AJUSTE (ate 12/09/2026): qualquer perfil corrige a entrada, porque a
      // equipe esta aprendendo a lancar e varios pacientes entraram com hora errada.
      // Depois disso, so o administrativo — e a data mora em fechamento.regras, entao a
      // trava volta sozinha, sem ninguem precisar lembrar.
      if (!dentroDaSemanaDeAjuste() && String(papel || '').toUpperCase() !== 'ADMIN') {
        throw new BadRequestException(
          'A hora de entrada só pode ser corrigida pelo administrativo. Ela é o relógio das diárias — mudá-la muda a conta inteira.',
        );
      }
      const d = new Date((dto as any).admissionAt);
      if (Number.isNaN(d.getTime())) throw new BadRequestException('Data de entrada inválida.');
      if (d.getTime() > Date.now() + 60_000) throw new BadRequestException('A entrada não pode ser no futuro.');
      updateData.date = d;
    }

    if (dto.status === 'DISCHARGED' && !metadata.actualDischargeDate) {
      metadata.actualDischargeDate = new Date().toISOString();
      updateData.notes = JSON.stringify(metadata);
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            contacts: { where: { isPrimary: true }, take: 1 },
          },
        },
        pet: { select: { id: true, name: true, species: true, breed: true, birthDate: true } },
        user: { select: { id: true, name: true, email: true } },
        treatments: { select: { id: true, description: true, cost: true, createdAt: true } },
      },
    });

    // Move card in Hospitalization board based on status
    if (dto.status && dto.status !== current.status) {
      const statusToColumnMap: Record<string, string> = {
        ADMITTED: 'Admissão',
        IN_TREATMENT: 'Em Tratamento',
        OBSERVATION: 'Observação',
        DISCHARGE_SCHEDULED: 'Alta Programada',
        DISCHARGED: 'Alta',
      };

      const targetColumn = statusToColumnMap[dto.status];
      if (targetColumn) {
        this.boardsService
          .moveCardToColumn(id, targetColumn)
          .catch((err) => console.error('Error moving hospitalization card:', err));
      }
    }

    return this.toHospitalization(updated, metadata);
  }

  /**
   * Apaga a internação E TUDO O QUE E DELA.
   *
   * A internação nao mora numa tabela propria: a conta, as aferições, o controle de
   * fluidos, as prescricoes, as doses aplicadas, a evolucao e o log vivem em LISTAS
   * chaveadas pelo id do atendimento (`intconta_<id>`, `intvital_<id>`...). Apagar so o
   * atendimento deixava tudo isso orfao no banco pra sempre — invisivel, sem dono, e
   * ocupando espaco. E o BOX ficava presoueando um paciente que nao existe mais, que foi
   * exatamente o que prendeu o B02 por 14 dias.
   *
   * Devolve o que foi apagado, pra tela poder dizer a verdade em vez de "excluido com
   * sucesso" sem mais.
   */
  async remove(id: string) {
    const existing = await this.prisma.appointment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Internação não encontrada');

    // As listas desta internação. O prefixo é a convenção do módulo inteiro.
    const prefixos = ['intconta_', 'intvital_', 'intfluido_', 'intpresc_', 'intmed_', 'intevo_',
      'intlog_', 'intbol_', 'intbolprog_', 'intboletim_hist_', 'intfechamento_'];
    const listas = prefixos.map((p) => `${p}${id}`);
    const apagadas = await this.prisma.listaItem.deleteMany({ where: { lista: { in: listas } } }).catch(() => ({ count: 0 }));

    // Solta o box. Com a chave estrangeira (SetNull) o ponteiro se limpa sozinho ao apagar
    // o atendimento, mas a ocupação continuaria ABERTA — e o box, ocupado por ninguém.
    const boxes = await this.prisma.boxOcupacao.updateMany({
      where: { appointmentId: id, ativa: true },
      data: { ativa: false, saidaAt: new Date() },
    }).catch(() => ({ count: 0 }));

    await this.prisma.appointment.delete({ where: { id } });
    return {
      message: 'Internação excluída com sucesso',
      registrosApagados: apagadas.count,
      boxesLiberados: boxes.count,
    };
  }
}
