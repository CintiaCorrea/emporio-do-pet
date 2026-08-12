import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrcamentoDto } from './dto/create-orcamento.dto';
import { UpdateOrcamentoDto } from './dto/update-orcamento.dto';
import { AppointmentsService } from '../appointments/appointments.service';
import { ExamesService } from '../exames/exames.service';

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
  } as const;

  async findByPet(petId: string) {
    return this.prisma.orcamento.findMany({
      where: { petId },
      include: this.ORC_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Busca global de orçamentos (localizar) — filtro por status + busca por tutor/pet
  async findAll(params?: { status?: string; busca?: string }) {
    const { status, busca } = params || {};
    const where: any = {};
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

  async create(dto: CreateOrcamentoDto, userId?: string) {
    const pet = await this.prisma.pet.findUnique({
      where: { id: dto.petId },
      select: { id: true, tutorId: true },
    });
    if (!pet) throw new NotFoundException('Pet não encontrado');

    const itens = await this.resolverItens(mapItens(dto.itens));
    const valorTotal = itens.reduce((s, it) => s + it.valorTotal, 0);

    const orcamento = await this.prisma.orcamento.create({
      data: {
        petId: dto.petId,
        tutorId: dto.tutorId ?? pet.tutorId ?? null,
        validade: dto.validade ? new Date(dto.validade) : null,
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
      return { servicoId, productId, descricao: it.descricao, quantidade: it.quantidade, valorUnitario: it.valorUnitario, desconto: it.desconto, valorTotal: it.valorTotal };
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

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.orcamento.delete({ where: { id } });
    return { ok: true };
  }

  async converter(id: string, dto: { userId?: string; date?: string } = {}, currentUserId?: string) {
    const orc = await this.prisma.orcamento.findUnique({ where: { id }, include: { itens: true } });
    if (!orc) throw new NotFoundException('Orçamento não encontrado');
    if (orc.appointmentId) throw new BadRequestException('Orçamento já convertido em venda');

    const pet = await this.prisma.pet.findUnique({ where: { id: orc.petId }, select: { tutorId: true } });
    const tutorId = orc.tutorId ?? pet?.tutorId;
    if (!tutorId) throw new BadRequestException('Tutor do pet não encontrado');
    const userId = dto.userId ?? currentUserId;
    if (!userId) throw new BadRequestException('Profissional (userId) é obrigatório');

    // Identidade dos exames do orçamento (orcexa_) carregada ANTES — pra injetar fornecedor + custo do
    // lab no AppointmentItem (alimenta o a-pagar) e depois iniciar o ciclo do exame.
    let examItemsRaw: any[] = [];
    const examPorNome: Record<string, any> = {};
    try {
      const orcExa = await this.prisma.listaItem.findMany({ where: { lista: `orcexa_${id}` }, select: { valor: true } });
      examItemsRaw = orcExa.map((r) => { try { return JSON.parse(r.valor); } catch { return null; } }).filter(Boolean);
      for (const e of examItemsRaw) { if (e?.descricao) examPorNome[String(e.descricao).toLowerCase().trim()] = e; }
    } catch { /* sem companheiro */ }

    const appointment = await this.appointmentsService.create({
      tutorId,
      petId: orc.petId,
      userId,
      date: dto.date ?? new Date().toISOString(),
      value: orc.valorTotal,
      items: orc.itens.map((it) => {
        const ex = examPorNome[String(it.descricao || '').toLowerCase().trim()];
        return {
          servicoId: it.servicoId ?? undefined,
          productId: (it as any).productId ?? undefined,
          descricao: it.descricao ?? undefined,
          quantidade: it.quantidade,
          valorUnitario: it.valorUnitario,
          desconto: it.desconto,
          valorTotal: it.valorTotal,
          ...(ex ? { fornecedorId: ex.fornecedorId ?? undefined, custoUnitario: ex.custoUnitario != null ? Number(ex.custoUnitario) : undefined } : {}),
        };
      }),
    } as any);

    await this.prisma.orcamento.update({
      where: { id },
      data: { appointmentId: (appointment as any).id, status: 'APROVADO' },
    });

    // 🔬 Converteu o orçamento → inicia o ciclo dos exames dele no Kanban (usa o companheiro orcexa_).
    try {
      const examItems = examItemsRaw.map((e) => ({ ...e, origem: 'ORCAMENTO' }));
      if (examItems.length) await this.examesService.iniciarExamesDaVenda(orc.petId, examItems as any[]);
    } catch { /* não quebra a conversão */ }

    return appointment;
  }
}
