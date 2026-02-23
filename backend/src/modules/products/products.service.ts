import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params?: {
    page?: number;
    limit?: number;
    skip?: number;
    take?: number;
    search?: string;
    type?: string;
    lowStock?: boolean;
  }) {
    const { page = 1, limit = 10, skip, take, search, type, lowStock } = params || {};

    const resolvedTake = Number.isFinite(take as any) ? (take as number) : limit;
    const resolvedSkip = Number.isFinite(skip as any)
      ? (skip as number)
      : Math.max(0, (page - 1) * resolvedTake);

    const where: any = {};
    if (type) where.type = type;
    if (lowStock) where.stock = { lt: 10 };
    if (search) {
      where.OR = [{ name: { contains: search, mode: 'insensitive' as const } }];
    }

    const [products, total, stats, lowStockCount] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          treatments: {
            select: {
              id: true,
              description: true,
              cost: true,
              appointment: {
                select: {
                  id: true,
                  date: true,
                  pet: { select: { name: true } },
                },
              },
            },
            orderBy: { createdAt: 'desc' as const },
            take: 5,
          },
          _count: { select: { treatments: true } },
        },
        orderBy: { name: 'asc' as const },
        skip: resolvedSkip,
        take: resolvedTake,
      }),
      this.prisma.product.count({ where }),
      this.prisma.product.aggregate({
        where,
        _count: { id: true },
        _sum: { stock: true, price: true },
        _avg: { price: true },
      }),
      this.prisma.product.count({
        where: {
          ...where,
          stock: { lt: 10 },
        },
      }),
    ]);

    return {
      products,
      stats: {
        total: stats._count.id,
        totalStock: stats._sum.stock || 0,
        totalValue: stats._sum.price || 0,
        averagePrice: stats._avg.price || 0,
        lowStockCount,
      },
      pagination: {
        page,
        limit: resolvedTake,
        total,
        pages: Math.ceil(total / resolvedTake),
      },
    };
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        treatments: {
          include: {
            appointment: {
              include: {
                pet: { select: { id: true, name: true, species: true } },
                tutor: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' as const },
        },
        _count: { select: { treatments: true } },
      },
    });

    if (!product) throw new NotFoundException('Product não encontrado');
    return product;
  }

  async create(dto: CreateProductDto) {
    if (dto.price < 0) throw new BadRequestException('Preço não pode ser negativo');
    if (dto.stock !== undefined && dto.stock < 0)
      throw new BadRequestException('Estoque não pode ser negativo');

    const existing = await this.prisma.product.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' as const } },
    });
    if (existing) throw new BadRequestException('Já existe um produto com este nome');

    const defaultStock = dto.type === ('SERVICE' as any) ? 0 : dto.stock || 0;

    return this.prisma.product.create({
      data: {
        name: dto.name,
        type: dto.type as any,
        price: dto.price,
        stock: defaultStock,
      },
      include: { _count: { select: { treatments: true } } },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { treatments: true } } },
    });
    if (!existing) throw new NotFoundException('Product não encontrado');

    if (dto.price !== undefined && dto.price < 0) {
      throw new BadRequestException('Preço não pode ser negativo');
    }
    if (dto.stock !== undefined && dto.stock < 0) {
      throw new BadRequestException('Estoque não pode ser negativo');
    }

    if (dto.name && dto.name !== existing.name) {
      const existingName = await this.prisma.product.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' as const },
          id: { not: id },
        },
      });
      if (existingName) throw new BadRequestException('Já existe outro produto com este nome');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type as any;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.stock !== undefined) data.stock = dto.stock;

    if (dto.type === ('SERVICE' as any) && dto.stock === undefined) {
      data.stock = 0;
    }

    return this.prisma.product.update({
      where: { id },
      data,
      include: { _count: { select: { treatments: true } } },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { treatments: true } } },
    });
    if (!existing) throw new NotFoundException('Product não encontrado');

    if (existing._count.treatments > 0) {
      throw new BadRequestException('Não é possível excluir produto com treatments vinculados');
    }

    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product excluído com sucesso' };
  }
}
