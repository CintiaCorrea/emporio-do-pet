import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { CreatePedidoCompraDto } from './dto/create-pedido-compra.dto';
import { UpdatePedidoCompraDto } from './dto/update-pedido-compra.dto';

@Injectable()
export class PedidosCompraService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
  ) {}

  private include = {
    fornecedor: { select: { id: true, nome: true } },
    itens: { include: { product: { select: { id: true, name: true, stock: true } } } },
  };

  async list(params: { status?: string; fornecedorId?: string }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.fornecedorId) where.fornecedorId = params.fornecedorId;
    return this.prisma.pedidoCompra.findMany({
      where,
      include: this.include,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const p = await this.prisma.pedidoCompra.findUnique({ where: { id }, include: this.include });
    if (!p) throw new NotFoundException('Pedido não encontrado');
    return p;
  }

  async create(dto: CreatePedidoCompraDto, user: { id: string; name?: string; email: string }) {
    return this.prisma.pedidoCompra.create({
      data: {
        fornecedorId: dto.fornecedorId || null,
        status: dto.status || 'RASCUNHO',
        observacao: dto.observacao || null,
        previsao: dto.previsao ? new Date(dto.previsao) : null,
        userId: user.id,
        userName: user.name || user.email,
        itens: {
          create: (dto.itens || []).map((i) => ({
            productId: i.productId || null,
            descricao: i.descricao,
            quantidade: i.quantidade,
            custoUnitario: i.custoUnitario ?? null,
          })),
        },
      },
      include: this.include,
    });
  }

  async update(id: string, dto: UpdatePedidoCompraDto) {
    const atual = await this.prisma.pedidoCompra.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException('Pedido não encontrado');
    if (atual.status === 'RECEBIDO') throw new BadRequestException('Pedido já recebido não pode ser editado.');

    const data: any = {};
    if (dto.fornecedorId !== undefined) data.fornecedorId = dto.fornecedorId || null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.observacao !== undefined) data.observacao = dto.observacao || null;
    if (dto.previsao !== undefined) data.previsao = dto.previsao ? new Date(dto.previsao) : null;

    // Se os itens vierem, substituem os atuais (apaga e recria).
    if (dto.itens !== undefined) {
      await this.prisma.pedidoCompraItem.deleteMany({ where: { pedidoId: id } });
      data.itens = {
        create: (dto.itens || []).map((i) => ({
          productId: i.productId || null,
          descricao: i.descricao,
          quantidade: i.quantidade,
          custoUnitario: i.custoUnitario ?? null,
        })),
      };
    }
    return this.prisma.pedidoCompra.update({ where: { id }, data, include: this.include });
  }

  async remove(id: string) {
    const p = await this.prisma.pedidoCompra.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Pedido não encontrado');
    await this.prisma.pedidoCompra.delete({ where: { id } });
    return { ok: true };
  }

  // Receber: cada item com produto vira ENTRADA de estoque (origem COMPRA, recalcula custo médio).
  async receber(id: string, user: { id: string; name?: string; email: string }) {
    const pedido = await this.prisma.pedidoCompra.findUnique({ where: { id }, include: { itens: true } });
    if (!pedido) throw new NotFoundException('Pedido não encontrado');
    if (pedido.status === 'RECEBIDO') throw new BadRequestException('Pedido já foi recebido.');
    if (pedido.status === 'CANCELADO') throw new BadRequestException('Pedido cancelado não pode ser recebido.');

    let entradas = 0;
    for (const it of pedido.itens) {
      if (!it.productId) continue; // item de texto livre não movimenta estoque
      await this.stock.createMovement(
        {
          productId: it.productId,
          type: 'IN' as any,
          quantity: it.quantidade,
          reason: `Recebimento do pedido de compra #${pedido.numero}`,
          ...(it.custoUnitario != null ? { custoUnitario: it.custoUnitario } : {}),
        },
        user,
      );
      entradas++;
    }

    const atualizado = await this.prisma.pedidoCompra.update({
      where: { id },
      data: { status: 'RECEBIDO', recebidoEm: new Date() },
      include: this.include,
    });
    return { ...atualizado, entradas };
  }
}
