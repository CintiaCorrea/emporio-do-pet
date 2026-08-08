import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

// Campos do catálogo (Fase 1) copiados do DTO p/ o data do create/update, quando presentes.
const PRODUCT_EXTRA_KEYS = [
  'codigoBarras', 'unidadeVenda', 'marca', 'categoryId', 'custoPadrao', 'proposito', 'markup',
  'exibeListaPreco', 'permiteAlterarPreco', 'controlaEstoque', 'estoqueMin', 'estoqueMax',
  'comissionado', 'comissaoTipo', 'comissaoValor', 'fornecedorId',
  'planoTipo', 'planoUnidades', 'planoIntervaloDias',
] as const;

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
    excludeService?: boolean; // esconde itens tipo SERVICE (catálogo unificado) — p/ seletores de produto/estoque
    categoryId?: string; // filtra por categoria de serviço (ex.: "Exames · Bioquímica")
    fornecedorId?: string; // filtra por fornecedor/laboratório
  }) {
    const { page = 1, limit = 10, skip, take, search, type, lowStock, excludeService, categoryId, fornecedorId } = params || {};

    const resolvedTake = Number.isFinite(take as any) ? (take as number) : limit;
    const resolvedSkip = Number.isFinite(skip as any)
      ? (skip as number)
      : Math.max(0, (page - 1) * resolvedTake);

    const where: any = {};
    if (type) where.type = type;
    else if (excludeService) where.type = { not: 'SERVICE' };
    if (lowStock) where.stock = { lt: 10 };
    if (categoryId) where.categoryId = categoryId;
    if (fornecedorId) where.fornecedorId = fornecedorId;
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
          fornecedor: { select: { id: true, nome: true } },
          category: { select: { id: true, nome: true } },
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

    const data: any = { name: dto.name, type: dto.type as any, price: dto.price, stock: defaultStock };
    for (const k of PRODUCT_EXTRA_KEYS) if ((dto as any)[k] !== undefined) data[k] = (dto as any)[k];

    return this.prisma.product.create({
      data,
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
    for (const k of PRODUCT_EXTRA_KEYS) if ((dto as any)[k] !== undefined) data[k] = (dto as any)[k];

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

  // ===== Importação de catálogo por CSV (serviços + produtos) =====
  // Formato: tipo;nome;categoria;preco;custo;ativo;aparece_no_pdv;marca;unidade;codigo_barras;estoque
  // Regras (decididas com a Cintia): importa tudo; remove duplicados (fico com 1); preço 0 = INATIVO;
  // itens atuais que NÃO estão na lista = INATIVOS (reversível). dryRun=true só devolve a prévia.
  private csvNum(s?: string): number | null {
    let t = (s || '').trim();
    if (!t) return null;
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  private normNome(s?: string): string {
    return (s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
  }
  // Parser de linha CSV que RESPEITA aspas (campos com o separador dentro de "..." não quebram).
  private parseCsvLine(line: string, sep: string): string[] {
    const out: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === sep) { out.push(cur); cur = ''; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  }

  async importarCatalogo(csv: string, opts?: { dryRun?: boolean }) {
    const dryRun = !!opts?.dryRun;
    const linhas = String(csv || '').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim().length);
    if (!linhas.length) throw new BadRequestException('CSV vazio');
    // Detecta o separador: TAB > ";" > ",". A vírgula agora é aceita porque o parser
    // respeita aspas e os decimais deste catálogo usam ponto (1214.00).
    const cont = (s: string, ch: string) => (s.match(new RegExp(ch === '\t' ? '\\t' : `\\${ch}`, 'g')) || []).length;
    const h0 = linhas[0];
    const sep = cont(h0, '\t') > 0 ? '\t' : cont(h0, ';') > 0 ? ';' : cont(h0, ',') > 0 ? ',' : ';';
    const sepLabel = sep === '\t' ? 'TAB' : sep === ',' ? 'vírgula (,)' : 'ponto e vírgula (;)';
    const start = /tipo/i.test(linhas[0]) && /nome/i.test(linhas[0]) ? 1 : 0;

    const vistos = new Set<string>();
    const itens: any[] = [];
    const suspeitos: string[] = [];
    let duplicadosRemovidos = 0;

    for (let i = start; i < linhas.length; i++) {
      const c = this.parseCsvLine(linhas[i], sep);
      const nome = (c[1] || '').trim();
      if (!nome) continue;
      const chave = this.normNome(nome);
      if (vistos.has(chave)) { duplicadosRemovidos++; continue; }
      vistos.add(chave);
      const isProduto = (c[0] || '').trim().toLowerCase().startsWith('produto');
      const preco = this.csvNum(c[3]) ?? 0;
      const ativo = preco > 0; // preço 0 → inativo
      if (preco <= 0) suspeitos.push(nome);
      else if (/(rpro|repro|felinor)$/i.test(nome)) suspeitos.push(`${nome} (nome suspeito)`);
      itens.push({
        nome, isProduto, preco, ativo,
        custo: this.csvNum(c[4]),
        catNome: (c[2] || '').trim(),
        marca: (c[7] || '').trim() || null,
        unidade: (c[8] || '').trim() || null,
        codBarras: (c[9] || '').trim() || null,
        estoque: this.csvNum(c[10]),
        fornNome: (c[11] || '').trim() || null, // coluna nova (opcional): fornecedor
      });
    }
    if (!itens.length) {
      const nCols = this.parseCsvLine(linhas[start] || h0, sep).length;
      const dica = nCols < 2
        ? 'Não consegui separar as colunas. Se você exportou do Excel, use "Salvar como > CSV UTF-8" — não envie .xlsx.'
        : 'A 2ª coluna (nome) veio vazia em todas as linhas. Confira se a ordem é: tipo,nome,categoria,preco,custo,ativo,aparece_no_pdv,marca,unidade,codigo_barras,estoque';
      throw new BadRequestException(`Nenhum item válido. Detectei separador "${sepLabel}" e ${nCols} coluna(s) na 1ª linha de dados. ${dica}`);
    }

    const existentes = await this.prisma.product.findMany({ select: { id: true, name: true, price: true, ativo: true } });
    const mapaExist = new Map(existentes.map((e) => [this.normNome(e.name), e]));
    const chavesLista = new Set(itens.map((i) => this.normNome(i.nome)));
    let novos = 0, atualizados = 0;
    for (const it of itens) (mapaExist.has(this.normNome(it.nome)) ? atualizados++ : novos++);
    const foraDaLista = existentes.filter((e) => e.ativo && !chavesLista.has(this.normNome(e.name)));

    const relatorio = {
      totalItens: itens.length,
      produtos: itens.filter((i) => i.isProduto).length,
      servicos: itens.filter((i) => !i.isProduto).length,
      novos, atualizados, duplicadosRemovidos,
      precoZeroInativados: itens.filter((i) => !i.ativo).length,
      foraDaListaInativados: foraDaLista.length,
      foraDaLista: foraDaLista.map((e) => e.name).sort((a, b) => a.localeCompare(b)).slice(0, 300),
      totalSuspeitos: suspeitos.length,
      suspeitos: suspeitos.slice(0, 60),
    };
    if (dryRun) return { dryRun: true, ...relatorio };

    // ---------- IMPORT REAL (com backup) ----------
    // Backup do que existe hoje (pra desfazer se preciso) — UM registro por item.
    // (Não guardar o catálogo inteiro num único `valor`: passaria do limite do índice único de lista_itens.)
    const backupLista = `backup_catalogo_${new Date().toISOString().slice(0, 19)}`;
    await this.prisma.listaItem.createMany({
      data: existentes.map((it) => ({ lista: backupLista, valor: JSON.stringify(it).slice(0, 6000) })),
      skipDuplicates: true,
    });

    // Categorias: resolve/cria as distintas de uma vez.
    const catNomes = [...new Set(itens.map((i) => i.catNome).filter(Boolean))];
    const cats = await this.prisma.serviceCategory.findMany({ select: { id: true, nome: true } });
    const catMap = new Map(cats.map((c) => [this.normNome(c.nome), c.id]));
    for (const cn of catNomes) {
      if (!catMap.has(this.normNome(cn))) {
        const nova = await this.prisma.serviceCategory.create({ data: { nome: cn } });
        catMap.set(this.normNome(cn), nova.id);
      }
    }

    // Fornecedores: resolve/cria os distintos (coluna nova do CSV) — tipo default LABORATORIO.
    const fornNomes = [...new Set(itens.map((i) => i.fornNome).filter(Boolean))];
    const fornsAll = await this.prisma.fornecedor.findMany({ select: { id: true, nome: true } });
    const fornMap = new Map(fornsAll.map((f) => [this.normNome(f.nome), f.id]));
    for (const fn of fornNomes) {
      if (!fornMap.has(this.normNome(fn))) {
        const nova = await this.prisma.fornecedor.create({ data: { nome: fn } });
        fornMap.set(this.normNome(fn), nova.id);
      }
    }

    const dadosDe = (it: any) => ({
      type: (it.isProduto ? 'MEDICINE' : 'SERVICE') as any,
      price: it.preco,
      custoPadrao: it.custo ?? undefined,
      categoryId: it.catNome ? catMap.get(this.normNome(it.catNome)) : undefined,
      marca: it.marca ?? undefined,
      unidadeVenda: it.unidade ?? undefined,
      codigoBarras: it.codBarras ?? undefined,
      fornecedorId: it.fornNome ? (fornMap.get(this.normNome(it.fornNome)) ?? undefined) : undefined,
      stock: it.isProduto ? Math.round(it.estoque ?? 0) : 0,
      ativo: it.ativo,
    });

    let criados = 0, atualizadosN = 0;
    for (const it of itens) {
      const ex = mapaExist.get(this.normNome(it.nome));
      if (ex) { await this.prisma.product.update({ where: { id: ex.id }, data: dadosDe(it) }); atualizadosN++; }
      else { await this.prisma.product.create({ data: { name: it.nome, ...dadosDe(it) } }); criados++; }
    }
    // Itens atuais fora da lista → inativos (não apaga).
    if (foraDaLista.length) {
      await this.prisma.product.updateMany({ where: { id: { in: foraDaLista.map((f) => f.id) } }, data: { ativo: false } });
    }

    return { dryRun: false, ...relatorio, criados, atualizados: atualizadosN, inativados: foraDaLista.length };
  }

  // ── Ficha técnica (ProdutoComposicao): insumos que um procedimento/kit consome ──
  async getComposicao(paiId: string) {
    const rows = await this.prisma.produtoComposicao.findMany({
      where: { paiId },
      include: { item: { select: { id: true, name: true, type: true, stock: true, custoPadrao: true, unidadeVenda: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      itemId: r.itemId,
      quantidade: r.quantidade,
      custoUnitario: r.precoUnitario ?? r.item?.custoPadrao ?? null,
      item: r.item,
    }));
  }

  async setComposicao(
    paiId: string,
    itens: Array<{ itemId: string; quantidade: number; custoUnitario?: number | null }>,
  ) {
    const pai = await this.prisma.product.findUnique({ where: { id: paiId }, select: { id: true } });
    if (!pai) throw new NotFoundException('Item não encontrado');
    const limpos = (itens || []).filter(
      (i) => i && i.itemId && i.itemId !== paiId && Number(i.quantidade) > 0,
    );
    await this.prisma.$transaction([
      this.prisma.produtoComposicao.deleteMany({ where: { paiId } }),
      ...(limpos.length
        ? [this.prisma.produtoComposicao.createMany({
            data: limpos.map((i) => ({
              paiId,
              itemId: i.itemId,
              quantidade: Number(i.quantidade),
              precoUnitario: i.custoUnitario ?? null,
            })),
          })]
        : []),
    ]);
    return this.getComposicao(paiId);
  }
}
