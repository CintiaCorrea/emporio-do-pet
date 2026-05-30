import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceCategoryDto, UpdateServiceCategoryDto } from './dto/category.dto';
import { CreateServicoDto, UpdateServicoDto } from './dto/servico.dto';

@Injectable()
export class ServicosService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Categorias =====
  async listCategories(includeInactive = false) {
    return this.prisma.serviceCategory.findMany({
      where: includeInactive ? {} : { ativo: true },
      orderBy: { nome: 'asc' },
      include: { _count: { select: { servicos: true } } },
    });
  }
  async createCategory(dto: CreateServiceCategoryDto) {
    return this.prisma.serviceCategory.create({ data: dto });
  }
  async updateCategory(id: string, dto: UpdateServiceCategoryDto) {
    const exists = await this.prisma.serviceCategory.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Categoria não encontrada');
    return this.prisma.serviceCategory.update({ where: { id }, data: dto });
  }
  async removeCategory(id: string) {
    const exists = await this.prisma.serviceCategory.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Categoria não encontrada');
    return this.prisma.serviceCategory.delete({ where: { id } });
  }

  // ===== Serviços =====
  async listServicos(includeInactive = false, categoryId?: string) {
    return this.prisma.servico.findMany({
      where: {
        ...(includeInactive ? {} : { ativo: true }),
        ...(categoryId ? { categoryId } : {}),
      },
      orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
      include: { category: { select: { id: true, nome: true } } },
    });
  }
  async createServico(dto: CreateServicoDto) {
    return this.prisma.servico.create({
      data: dto,
      include: { category: { select: { id: true, nome: true } } },
    });
  }
  async updateServico(id: string, dto: UpdateServicoDto) {
    const exists = await this.prisma.servico.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Serviço não encontrado');
    return this.prisma.servico.update({
      where: { id }, data: dto,
      include: { category: { select: { id: true, nome: true } } },
    });
  }
  async removeServico(id: string) {
    const exists = await this.prisma.servico.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Serviço não encontrado');
    return this.prisma.servico.delete({ where: { id } });
  }
}
