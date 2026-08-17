import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';

// Formato de resposta esperado pela tela de Estoque (mantido estável).
function toApi(m: any, productName?: string) {
  return {
    id: m.id,
    productId: m.productId,
    productName: productName ?? m.product?.name ?? '',
    type: m.tipo,
    quantity: m.quantidade,
    previousStock: m.saldoAntes,
    newStock: m.saldoDepois,
    reason: m.motivo ?? '',
    custoUnitario: m.custoUnitario ?? null,
    fornecedor: m.product?.fornecedor?.nome ?? null,
    origem: m.origem,
    userId: m.userId ?? null,
    userName: m.userName ?? null,
    createdAt: (m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt)).toISOString(),
  };
}

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async listMovements(params?: { page?: number; limit?: number; productId?: string }) {
    const { page = 1, limit = 100, productId } = params || {};
    const skip = (page - 1) * limit;
    const where: any = productId ? { productId } : {};

    const [rows, total] = await Promise.all([
      this.prisma.estoqueMovimento.findMany({
        where,
        include: { product: { select: { name: true, fornecedor: { select: { nome: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.estoqueMovimento.count({ where }),
    ]);

    return {
      movements: rows.map((r: any) => toApi(r)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async listMovementsByProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { name: true },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');

    const rows = await this.prisma.estoqueMovimento.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r: any) => toApi(r, product.name));
  }

  async createMovement(
    dto: CreateStockMovementDto,
    user: { id: string; name?: string; email: string },
  ) {
    // Tudo numa transação: mexer no saldo E gravar o movimento juntos (ou nada).
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: dto.productId } });
      if (!product) throw new NotFoundException('Produto não encontrado');

      const saldoAntes = product.stock;
      let saldoDepois = saldoAntes;
      if (dto.type === 'IN') {
        saldoDepois = saldoAntes + dto.quantity;
      } else if (dto.type === 'OUT') {
        saldoDepois = saldoAntes - dto.quantity;
        if (saldoDepois < 0) throw new BadRequestException('Quantidade insuficiente em estoque');
      } else if (dto.type === 'ADJUSTMENT') {
        saldoDepois = dto.quantity; // ajuste = novo saldo alvo
      }

      // Custo médio ponderado: na ENTRADA com custo informado, recalcula o custo do produto.
      let novoCusto: number | null = null;
      if (dto.type === 'IN' && dto.custoUnitario != null && dto.custoUnitario > 0) {
        const custoAtual = product.custoPadrao ?? dto.custoUnitario;
        const base = Math.max(0, saldoAntes);
        novoCusto = base > 0
          ? Math.round(((base * custoAtual + dto.quantity * dto.custoUnitario) / (base + dto.quantity)) * 10000) / 10000
          : dto.custoUnitario;
      }

      await tx.product.update({
        where: { id: dto.productId },
        data: { stock: saldoDepois, ...(novoCusto != null ? { custoPadrao: novoCusto } : {}) },
      });

      const mov = await tx.estoqueMovimento.create({
        data: {
          productId: product.id,
          tipo: dto.type,
          quantidade: dto.quantity,
          saldoAntes,
          saldoDepois,
          custoUnitario: dto.custoUnitario ?? null,
          motivo:
            dto.reason ||
            (dto.type === 'IN'
              ? 'Entrada de estoque'
              : dto.type === 'OUT'
                ? 'Saída de estoque'
                : 'Ajuste de estoque'),
          origem: dto.type === 'IN' && dto.custoUnitario != null ? 'COMPRA' : 'MANUAL',
          userId: user.id,
          userName: user.name || user.email,
        },
      });

      return { ...toApi(mov, product.name), novoCustoMedio: novoCusto };
    });
  }
}
