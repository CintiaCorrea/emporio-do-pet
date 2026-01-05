import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async listMovements(params?: { page?: number; limit?: number; productId?: string }) {
    const { page = 1, limit = 100, productId } = params || {};
    const skip = (page - 1) * limit;

    // Saídas automáticas baseadas em treatments
    const treatments = await this.prisma.treatment.findMany({
      where: {
        ...(productId ? { productId } : {}),
        productId: { not: null },
      },
      include: {
        product: true,
        appointment: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const movements = treatments
      .filter((t) => t.product)
      .map((t) => ({
        id: `treatment_${t.id}`,
        productId: t.product!.id,
        productName: t.product!.name,
        type: 'OUT',
        quantity: 1,
        previousStock: t.product!.stock + 1,
        newStock: t.product!.stock,
        reason: `Tratamento - ${t.description}`,
        userId: t.appointment.user.id,
        userName: t.appointment.user.name || t.appointment.user.email,
        createdAt: t.createdAt.toISOString(),
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const paginated = movements.slice(skip, skip + limit);

    return {
      movements: paginated,
      pagination: {
        page,
        limit,
        total: movements.length,
        pages: Math.ceil(movements.length / limit),
      },
    };
  }

  async listMovementsByProduct(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produto não encontrado');

    const treatments = await this.prisma.treatment.findMany({
      where: { productId },
      include: {
        appointment: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const movements = treatments
      .map((t) => ({
        id: `treatment_${t.id}`,
        productId: product.id,
        productName: product.name,
        type: 'OUT',
        quantity: 1,
        previousStock: product.stock + 1,
        newStock: product.stock,
        reason: `Tratamento - ${t.description}`,
        userId: t.appointment.user.id,
        userName: t.appointment.user.name || t.appointment.user.email,
        createdAt: t.createdAt.toISOString(),
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return movements;
  }

  async createMovement(dto: CreateStockMovementDto, user: { id: string; name?: string; email: string }) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Produto não encontrado');

    const previousStock = product.stock;
    let newStock = previousStock;

    if (dto.type === 'IN') {
      newStock = previousStock + dto.quantity;
    } else if (dto.type === 'OUT') {
      newStock = previousStock - dto.quantity;
      if (newStock < 0) throw new BadRequestException('Quantidade insuficiente em estoque');
    } else if (dto.type === 'ADJUSTMENT') {
      newStock = dto.quantity;
    }

    await this.prisma.product.update({
      where: { id: dto.productId },
      data: { stock: newStock },
    });

    const movementId = `mov_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    return {
      id: movementId,
      productId: product.id,
      productName: product.name,
      type: dto.type,
      quantity: dto.quantity,
      previousStock,
      newStock,
      reason:
        dto.reason ||
        (dto.type === 'IN' ? 'Entrada de estoque' : dto.type === 'OUT' ? 'Saída de estoque' : 'Ajuste de estoque'),
      userId: user.id,
      userName: user.name || user.email,
      createdAt: new Date().toISOString(),
    };
  }
}


