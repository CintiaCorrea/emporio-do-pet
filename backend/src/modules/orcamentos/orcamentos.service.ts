import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrcamentoDto } from './dto/create-orcamento.dto';
import { UpdateOrcamentoDto } from './dto/update-orcamento.dto';
import { AppointmentsService } from '../appointments/appointments.service';
import { ExamesService } from '../exames/exames.service';
import { ligarAoItemDaVenda } from '../exames/vincular-item-da-venda';
import { dentroDaJanelaDeAjuste } from '../../common/janela-de-ajuste';
import { somarNoContador, LISTA_CONTADOR } from './contador-de-orcamentos.regras';

function calcItemTotal(it: any): number {
  const q = Number(it.quantidade ?? 1);
  const vu = Number(it.valorUnitario ?? 0);
  const desc = Number(it.desconto ?? 0);
  return Math.max(0, q * vu - desc);
}

function mapItens(itens: any[] | undefined) {
  return (itens ?? []).map((it) => ({
    servicoId: it.servicoId ?? null,
    productId: it.productId ?? null,
    catalogoItemId: it.catalogoItemId ?? null,
    fornecedorId: it.fornecedorId ?? null,
    custoUnitario: it.custoUnitario != null ? Number(it.custoUnitario) : null,
    descricao: it.descricao ?? null,
    quantidade: Number(it.quantidade ?? 1),
    valorUnitario: Number(it.valorUnitario ?? 0),
    desconto: Number(it.desconto ?? 0),
    valorTotal: calcItemTotal(it),
  }));
}

@Injectable()
export class OrcamentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointmentsService: AppointmentsService,
    private readonly examesService: ExamesService,
  ) {}

  // include padrão — traz itens + autor + pet/tutor (necessários p/ impressão com timbrado)
  private readonly ORC_INCLUDE = {
    itens: true,
    createdBy: { select: { id: true, name: true } },
    pet: { select: { id: true, name: true, species: true, breed: true, birthDate: true, weight: true } },
    tutor: { select: { id: true, name: true, contacts: { where: { isPrimary: true }, take: 1 } } },
    // A VENDA LIGADA, quando existe. E dela que sai o terceiro degrau da escada da Cintia
    // (em aberto -> venda -> recebido): sem os recebimentos, um orcamento convertido e NAO
    // pago apareceria como concluido, e a recepcao deixaria de cobrar.
    appointment: {
      select: {
        id: true, value: true, numeroVenda: true,
        recebimentos: { select: { valorTotal: true } },
      },
    },
  } as const;

  async findByPet(petId: string) {
    return this.prisma.orcamento.findMany({
      where: { petId },
      include: this.ORC_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Busca global de orçamentos (localizar) — filtro por status + busca por tutor/pet
  async findAll(params?: { status?: string; busca?: string; tutorId?: string }) {
    const { status, busca, tutorId } = params || {};
    const where: any = {};
    if (tutorId && tutorId.trim()) where.tutorId = tutorId.trim();
    if (status && status !== 'TODOS') where.status = status;
    if (busca && busca.trim()) {
      const q = busca.trim();
      where.OR = [
        { pet: { name: { contains: q, mode: 'insensitive' as const } } },
        { tutor: { name: { contains: q, mode: 'insensitive' as const } } },
      ];
    }
    return this.prisma.orcamento.findMany({
      where,
      include: this.ORC_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  async findOne(id: string) {
    const o = await this.prisma.orcamento.findUnique({
      where: { id },
      include: this.ORC_INCLUDE,
    });
    if (!o) throw new NotFoundException('Orçamento não encontrado');
    return o;
  }

  /** Quantos dias vale um orçamento novo — regra da casa, na lista `configvendas`. */
  private async diasDeValidadePadrao(): Promise<number> {
    try {
      const it = await this.prisma.listaItem.findFirst({ where: { lista: 'configvendas' } });
      const cfg = it?.valor ? JSON.parse(it.valor) : {};
      const n = Math.trunc(Number(cfg?.orcamentoValidade) || 0);
      return n > 0 ? n : 0;
    } catch { return 0; }
  }

  async create(dto: CreateOrcamentoDto, userId?: string) {
    const pet = await this.prisma.pet.findUnique({
      where: { id: dto.petId },
      select: { id: true, tutorId: true },
    });
    if (!pet) throw new NotFoundException('Pet não encontrado');

    const itens = await this.resolverItens(mapItens(dto.itens));
    const valorTotal = itens.reduce((s, it) => s + it.valorTotal, 0);

    // A VALIDADE PADRÃO SAI DA CONFIGURAÇÃO (17/09/2026). Era um campo na tela de Configuração de
    // vendas que ninguém lia: todo orçamento nascia "sem validade", e a lista mostrava isso em
    // cinza para sempre. Agora o número vale — e continua possível mandar uma data própria.
    let validade: Date | null = dto.validade ? new Date(dto.validade) : null;
    if (!validade) {
      const dias = await this.diasDeValidadePadrao();
      if (dias > 0) {
        const d = new Date();
        d.setDate(d.getDate() + dias);
        d.setHours(23, 59, 59, 0);
        validade = d;
      }
    }

    const orcamento = await this.prisma.orcamento.create({
      data: {
        petId: dto.petId,
        tutorId: dto.tutorId ?? pet.tutorId ?? null,
        validade,
        observacao: dto.observacao ?? null,
        createdById: userId ?? null,
        valorTotal,
        itens: { create: itens },
      },
      include: { itens: true },
    });

    // Registro-companheiro (orcexa_) guarda a IDENTIDADE dos exames — na conversão inicia o ciclo
    // SEM depender de casar por nome (robusto p/ vários usuários).
    const examItens = (dto.itens ?? []).filter((it: any) => String(it.tipoItem || '').toUpperCase() === 'EXAME' || it.catalogoExameId);
    for (const it of examItens) {
      try {
        await this.prisma.listaItem.create({ data: {
          lista: `orcexa_${orcamento.id}`,
          valor: JSON.stringify({ descricao: it.descricao ?? null, catalogoExameId: it.catalogoExameId ?? null, fornecedorId: it.fornecedorId ?? null, valorUnitario: Number(it.valorUnitario) || null, custoUnitario: (it as any).custoUnitario != null ? Number((it as any).custoUnitario) : null }),
        } });
      } catch { /* não quebra o orçamento */ }
    }
    return orcamento;
  }

  // Resolve os FKs dos itens: um id só vira servicoId se existir em Servico; se for produto vai
  // em productId; senão fica item livre (só descrição). Evita quebra de FK quando a comanda/PDV
  // manda id de PRODUTO no campo servicoId (catálogo unificado). Também vale no update.
  private async resolverItens(itensRaw: any[]) {
    const ids = Array.from(new Set(itensRaw.flatMap((i) => [i.servicoId, i.productId]).filter(Boolean))) as string[];
    let svSet = new Set<string>(), prSet = new Set<string>();
    if (ids.length) {
      const [svs, prs] = await Promise.all([
        this.prisma.servico.findMany({ where: { id: { in: ids } }, select: { id: true } }).catch(() => []),
        this.prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true } }).catch(() => []),
      ]);
      svSet = new Set(svs.map((s: any) => s.id));
      prSet = new Set(prs.map((p: any) => p.id));
    }
    return itensRaw.map((it) => {
      let servicoId = it.servicoId && svSet.has(it.servicoId) ? it.servicoId : null;
      let productId = it.productId && prSet.has(it.productId) ? it.productId : null;
      // servicoId veio como id de produto (comanda/PDV) → move pra productId
      if (!servicoId && !productId && it.servicoId && prSet.has(it.servicoId)) productId = it.servicoId;
      return { servicoId, productId, catalogoItemId: it.catalogoItemId ?? null, fornecedorId: it.fornecedorId ?? null, custoUnitario: it.custoUnitario ?? null, descricao: it.descricao, quantidade: it.quantidade, valorUnitario: it.valorUnitario, desconto: it.desconto, valorTotal: it.valorTotal };
    });
  }

  async update(id: string, dto: UpdateOrcamentoDto) {
    await this.findOne(id);
    const data: any = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.validade !== undefined) data.validade = dto.validade ? new Date(dto.validade) : null;
    if (dto.observacao !== undefined) data.observacao = dto.observacao;
    if (dto.itens !== undefined) {
      const itens = await this.resolverItens(mapItens(dto.itens));
      data.valorTotal = itens.reduce((s, it) => s + it.valorTotal, 0);
      await this.prisma.orcamentoItem.deleteMany({ where: { orcamentoId: id } });
      data.itens = { create: itens };
    }
    return this.prisma.orcamento.update({ where: { id }, data, include: { itens: true } });
  }

  async aprovar(id: string) {
    await this.findOne(id);
    return this.prisma.orcamento.update({
      where: { id },
      data: { status: 'APROVADO' },
      include: { itens: true },
    });
  }

  /**
   * EXCLUIR UM ORÇAMENTO.
   *
   * O que ainda é proposta, sempre. O que JÁ VIROU VENDA, só dentro da janela de ajuste (Cintia,
   * 16/09/2026: "preciso poder deletar orçamentos que viraram vendas e ainda constam os orçamentos.
   * Pode liberar também até dia 19?").
   *
   * Apagar o orçamento convertido NÃO mexe na venda: a ligação é do lado do orçamento
   * (`appointmentId`, onDelete SetNull na venda), então a venda, os itens, os recebimentos e o
   * caixa ficam exatamente como estão. Some só a proposta duplicada que a ficha mostrava.
   *
   * Por que prazo: depois da arrumação de setembro, o orçamento convertido é o rastro de "de onde
   * esta venda veio" — apagar vira exceção de novo, e a janela fecha sozinha.
   */
  async remove(id: string) {
    const orc = await this.findOne(id);
    if ((orc as any)?.appointmentId && !dentroDaJanelaDeAjuste()) {
      throw new BadRequestException('Este orçamento já virou venda. Excluir orçamento convertido ficou liberado só até 19/09.');
    }
    await this.prisma.orcamento.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * A VOLTA: A VENDA VIRA ORÇAMENTO (Cintia, 17/09/2026: "vendas pode virar orçamento caso seja
   * feita errada, sem necessidade de refazer").
   *
   * Vender por engano acontece — o cliente desiste no balcão, ou era só para ele ver o preço. Antes
   * a saída era apagar a venda e montar tudo de novo, perdendo os itens já lançados.
   *
   * SÓ VALE PARA VENDA SEM DINHEIRO. Com recebimento, o caminho é outro (estornar ou devolver): uma
   * venda paga que virasse orçamento deixaria dinheiro no caixa sem venda nenhuma para explicá-lo.
   */
  async virarOrcamento(appointmentId: string, autor?: { role?: string; userId?: string }) {
    const venda = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { items: true, recebimentos: { select: { id: true }, take: 1 } },
    });
    if (!venda) throw new NotFoundException('Venda não encontrada');
    if ((venda.recebimentos || []).length) {
      throw new BadRequestException('Esta venda já tem dinheiro recebido. Estorne o recebimento antes de transformá-la em orçamento.');
    }
    if (!venda.petId || !venda.tutorId) throw new BadRequestException('Venda sem pet ou sem cliente — não dá para virar orçamento.');

    const itens = (venda.items || []).map((it) => ({
      descricao: it.descricao || 'Item',
      quantidade: Number(it.quantidade) || 1,
      valorUnitario: Number(it.valorUnitario) || 0,
      valorTotal: Number(it.valorTotal) || (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0),
      desconto: Number(it.desconto) || 0,
      servicoId: it.servicoId || undefined,
      productId: it.productId || undefined,
      catalogoItemId: it.catalogoItemId || undefined,
      fornecedorId: it.fornecedorId || undefined,
      custoUnitario: it.custoUnitario != null ? Number(it.custoUnitario) : undefined,
    }));
    if (!itens.length) throw new BadRequestException('Venda sem itens — não há o que orçar.');

    const orcamento = await this.create({
      petId: venda.petId,
      tutorId: venda.tutorId,
      observacao: [venda.notes, `Era a venda nº ${venda.numeroVenda ?? '—'}, desfeita em ${new Date().toLocaleDateString('pt-BR')}`].filter(Boolean).join(' · '),
      itens,
    } as any);

    // A venda sai pelo caminho de sempre (appointments.remove): é ele que sabe tudo o que uma venda
    // arrasta junto. Sem recebimento não há estorno nem estoque para devolver.
    await this.appointmentsService.remove(appointmentId, true, autor);
    return { ok: true, orcamento, numeroVendaAnterior: venda.numeroVenda ?? null };
  }

  /**
   * TRANSFORMAR O ORÇAMENTO EM VENDA — e o orçamento some.
   *
   * Cintia, 16/09/2026: no SimplesVet "ao transformar em venda o orçamento some, conseguimos seguir
   * esse padrão aqui? Mesmo porque o banco vai ficando inchado e sem necessidade." Fica só um
   * contador por mês (contador-de-orcamentos.regras).
   *
   * Até aqui a conversão criava a venda com o nome "CONSULTA", agendada, e sem a ligação com o
   * cadastro (o item do orçamento nem tinha o campo) — sem card de exame, sem estoque, "sem
   * vínculo". Agora a venda nasce "Venda", com os itens ligados ao cadastro, o laboratório e o
   * custo; o card do exame nasce pelo ponto único (venda.itens.gravados), como em qualquer venda.
   */
  async converter(id: string, dto: { userId?: string; date?: string } = {}, currentUserId?: string) {
    const orc = await this.prisma.orcamento.findUnique({ where: { id }, include: { itens: true } });
    if (!orc) throw new NotFoundException('Orçamento não encontrado');
    if (orc.appointmentId) throw new BadRequestException('Orçamento já transformado em venda');

    const pet = await this.prisma.pet.findUnique({ where: { id: orc.petId }, select: { tutorId: true } });
    const tutorId = orc.tutorId ?? pet?.tutorId;
    if (!tutorId) throw new BadRequestException('Tutor do pet não encontrado');
    const userId = dto.userId ?? currentUserId;
    if (!userId) throw new BadRequestException('Profissional (userId) é obrigatório');

    // Orçamentos antigos guardavam o laboratório do exame num registro-companheiro (orcexa_).
    const examPorNome: Record<string, any> = {};
    try {
      const orcExa = await this.prisma.listaItem.findMany({ where: { lista: `orcexa_${id}` }, select: { valor: true } });
      for (const r of orcExa) {
        try { const e = JSON.parse(r.valor); if (e?.descricao) examPorNome[String(e.descricao).toLowerCase().trim()] = e; } catch { /* linha ilegível */ }
      }
    } catch { /* sem companheiro */ }

    const appointment = await this.appointmentsService.create({
      tutorId,
      petId: orc.petId,
      userId,
      date: dto.date ?? new Date().toISOString(),
      type: 'Venda',
      status: 'COMPLETED',
      value: orc.valorTotal,
      notes: orc.observacao ?? null,
      items: orc.itens.map((it: any) => {
        const ex = examPorNome[String(it.descricao || '').toLowerCase().trim()];
        return {
          servicoId: it.servicoId ?? undefined,
          productId: it.productId ?? undefined,
          catalogoItemId: it.catalogoItemId ?? undefined,
          descricao: it.descricao ?? undefined,
          quantidade: it.quantidade,
          valorUnitario: it.valorUnitario,
          desconto: it.desconto,
          valorTotal: it.valorTotal,
          fornecedorId: it.fornecedorId ?? ex?.fornecedorId ?? undefined,
          custoUnitario: it.custoUnitario != null ? Number(it.custoUnitario) : ex?.custoUnitario != null ? Number(ex.custoUnitario) : undefined,
        };
      }),
    } as any);

    // A venda existe: o orçamento sai, e o mês ganha +1 no contador.
    await this.prisma.listaItem.deleteMany({ where: { lista: `orcexa_${id}` } }).catch(() => undefined);
    await this.prisma.orcamento.delete({ where: { id } });
    await somarNoContador(this.prisma as any).catch(() => undefined);

    return appointment;
  }

  /** Quantos orçamentos viraram venda, por mês (os 12 mais recentes). */
  async contador() {
    const linhas = await this.prisma.listaItem.findMany({
      where: { lista: LISTA_CONTADOR },
      select: { valor: true, ordem: true },
      orderBy: { valor: 'desc' },
      take: 12,
    });
    return linhas.map((l) => ({ mes: l.valor, quantidade: Number(l.ordem) || 0 }));
  }
}
