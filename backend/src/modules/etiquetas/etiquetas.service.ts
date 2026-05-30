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

  async importBatch(rows: any[], upsert = true) {
    let criados = 0, atualizados = 0, ignorados = 0;
    // Pre-criar categorias únicas (caso venham na planilha)
    const catNomes = [...new Set(rows.map(r => (r.categoria || '').trim()).filter(Boolean))];
    const catMap: Record<string, string> = {};
    for (const nome of catNomes) {
      let c = await this.prisma.tagCategory.findFirst({ where: { nome: { equals: nome, mode: 'insensitive' } } });
      if (!c) c = await this.prisma.tagCategory.create({ data: { nome, ativo: true } });
      catMap[nome] = c.id;
    }
    const TIPO_MAP: Record<string, string> = { 'clinica': 'CLINICA', 'clínica': 'CLINICA', 'status': 'STATUS', 'custom': 'CUSTOM' };
    for (const r of rows) {
      const texto = r.texto || r.nome;
      if (!texto) { ignorados++; continue; }
      const tipoKey = (r.tipo || 'custom').toString().toLowerCase().trim();
      const tipo = (TIPO_MAP[tipoKey] || 'CUSTOM') as any;
      const aplicaEm = r.aplicaEm ? (typeof r.aplicaEm === 'string' ? r.aplicaEm.split(/[,|;]/).map((s: string) => s.trim()).filter(Boolean) : r.aplicaEm) : ['Lead'];
      const data: any = {
        texto, tipo, cor: r.cor || null, descricao: r.descricao || null,
        aplicaEm, categoryId: r.categoria ? catMap[r.categoria.trim()] : null,
        ativo: r.ativo !== undefined ? r.ativo : true,
      };
      let existente = await this.prisma.etiquetaTemplate.findFirst({ where: { texto: { equals: texto, mode: 'insensitive' } } });
      if (existente) {
        if (!upsert) { ignorados++; continue; }
        await this.prisma.etiquetaTemplate.update({ where: { id: existente.id }, data });
        atualizados++;
      } else {
        await this.prisma.etiquetaTemplate.create({ data });
        criados++;
      }
    }
    return { criados, atualizados, ignorados, categoriasCriadas: catNomes.length };
  }
}