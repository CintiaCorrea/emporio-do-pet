import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagCategoryDto, UpdateTagCategoryDto } from './dto/category.dto';
import { CreateEtiquetaDto, UpdateEtiquetaDto } from './dto/etiqueta.dto';

@Injectable()
export class EtiquetasService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // TagCategory
  // ============================================

  async listCategories(includeInactive = false) {
    return this.prisma.tagCategory.findMany({
      where: includeInactive ? {} : { ativo: true },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
      include: { _count: { select: { etiquetas: true } } },
    });
  }

  async createCategory(dto: CreateTagCategoryDto) {
    return this.prisma.tagCategory.create({ data: dto });
  }

  async updateCategory(id: string, dto: UpdateTagCategoryDto) {
    const exists = await this.prisma.tagCategory.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Categoria não encontrada');
    return this.prisma.tagCategory.update({ where: { id }, data: dto });
  }

  async removeCategory(id: string) {
    const exists = await this.prisma.tagCategory.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Categoria não encontrada');
    return this.prisma.tagCategory.delete({ where: { id } });
  }

  // ============================================
  // EtiquetaTemplate
  // ============================================

  async listEtiquetas(includeInactive = false, categoryId?: string) {
    return this.prisma.etiquetaTemplate.findMany({
      where: {
        ...(includeInactive ? {} : { ativo: true }),
        ...(categoryId ? { categoryId } : {}),
      },
      include: { category: { select: { id: true, nome: true } } },
      orderBy: [{ ativo: 'desc' }, { tipo: 'asc' }, { texto: 'asc' }],
    });
  }

  async createEtiqueta(dto: CreateEtiquetaDto) {
    return this.prisma.etiquetaTemplate.create({
      data: dto,
      include: { category: { select: { id: true, nome: true } } },
    });
  }

  async updateEtiqueta(id: string, dto: UpdateEtiquetaDto) {
    const exists = await this.prisma.etiquetaTemplate.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Etiqueta não encontrada');
    return this.prisma.etiquetaTemplate.update({
      where: { id }, data: dto,
      include: { category: { select: { id: true, nome: true } } },
    });
  }

  async removeEtiqueta(id: string) {
    const exists = await this.prisma.etiquetaTemplate.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Etiqueta não encontrada');
    return this.prisma.etiquetaTemplate.delete({ where: { id } });
  }
}
