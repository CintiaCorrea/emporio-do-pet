import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrcamentoDto } from './dto/create-orcamento.dto';
import { UpdateOrcamentoDto } from './dto/update-orcamento.dto';
import { AppointmentsService } from '../appointments/appointments.service';

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

    return this.prisma.orcamento.create({
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

    const appointment = await this.appointmentsService.create({
      tutorId,
      petId: orc.petId,
      userId,
      date: dto.date ?? new Date().toISOString(),
      value: orc.valorTotal,
      items: orc.itens.map((it) => ({
        servicoId: it.servicoId ?? undefined,
        productId: (it as any).productId ?? undefined,
        descricao: it.descricao ?? undefined,
        quantidade: it.quantidade,
        valorUnitario: it.valorUnitario,
        desconto: it.desconto,
        valorTotal: it.valorTotal,
      })),
    } as any);

    await this.prisma.orcamento.update({
      where: { id },
      data: { appointmentId: (appointment as any).id, status: 'APROVADO' },
    });
    return appointment;
  }
}
