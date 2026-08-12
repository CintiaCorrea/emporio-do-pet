import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Catálogo Único (rebuild) — CRUD de itens (produto/serviço/exame/vacina/pacote/kit),
// grupos (árvore) e marcas. Cadastro só; venda/estoque vêm nas próximas fatias.
@Injectable()
export class CatalogoService {
  constructor(private readonly prisma: PrismaService) {}

  private async log(itemId: string, evento: string, detalhe: string | null, user?: any) {
    try {
      await this.prisma.itemHistorico.create({
        data: { itemId, evento, detalhe: detalhe || undefined, userId: user?.id || user?.userId, userName: user?.name || user?.nome },
      });
    } catch { /* histórico nunca derruba a operação */ }
  }

  // ── GRUPOS (árvore) ──────────────────────────────────────────────
  async listGrupos() {
    const grupos = await this.prisma.catGrupo.findMany({ orderBy: [{ agrupador: 'desc' }, { ordem: 'asc' }, { nome: 'asc' }] });
    // devolve plano + estrutura de árvore montada (pai → filhos)
    const byPai = new Map<string | null, any[]>();
    for (const g of grupos) { const k = g.paiId || null; if (!byPai.has(k)) byPai.set(k, []); byPai.get(k)!.push(g); }
    const montar = (paiId: string | null): any[] => (byPai.get(paiId) || []).map((g) => ({ ...g, filhos: montar(g.id) }));
    return { flat: grupos, tree: montar(null) };
  }
  async criarGrupo(dto: { nome: string; paiId?: string; agrupador?: boolean; ordem?: number }) {
    if (!dto?.nome?.trim()) throw new BadRequestException('Informe o nome do grupo');
    return this.prisma.catGrupo.create({ data: { nome: dto.nome.trim(), paiId: dto.paiId || undefined, agrupador: !!dto.agrupador, ordem: dto.ordem ?? 0 } });
  }
  async atualizarGrupo(id: string, dto: any) {
    return this.prisma.catGrupo.update({ where: { id }, data: { nome: dto.nome?.trim(), paiId: dto.paiId ?? undefined, agrupador: dto.agrupador, ordem: dto.ordem, ativo: dto.ativo } });
  }
  async removerGrupo(id: string) {
    const [nItens, nFilhos] = await Promise.all([
      this.prisma.itemCatalogo.count({ where: { grupoId: id } }),
      this.prisma.catGrupo.count({ where: { paiId: id } }),
    ]);
    if (nItens > 0) throw new BadRequestException(`Este grupo tem ${nItens} item(ns). Mova-os antes de excluir.`);
    if (nFilhos > 0) throw new BadRequestException(`Este grupo tem ${nFilhos} subgrupo(s). Remova-os antes.`);
    await this.prisma.catGrupo.delete({ where: { id } });
    return { ok: true };
  }

  // ── MARCAS ───────────────────────────────────────────────────────
  async listMarcas() {
    return this.prisma.catMarca.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } });
  }
  async criarMarca(dto: { nome: string }) {
    const nome = dto?.nome?.trim();
    if (!nome) throw new BadRequestException('Informe o nome da marca');
    const existe = await this.prisma.catMarca.findUnique({ where: { nome } });
    if (existe) return existe;
    return this.prisma.catMarca.create({ data: { nome } });
  }

  // ── ITENS ────────────────────────────────────────────────────────
  async listItens(q: any) {
    const where: any = {};
    if (q?.tipo) where.tipo = q.tipo;
    if (q?.grupoId) where.grupoId = q.grupoId;
    if (q?.situacao === 'ARQUIVADO') where.arquivado = true;
    else if (q?.situacao === 'INATIVO') { where.arquivado = false; where.ativo = false; }
    else where.arquivado = false; // padrão: só não-arquivados
    if (q?.search) where.nome = { contains: String(q.search), mode: 'insensitive' };
    const itens = await this.prisma.itemCatalogo.findMany({
      where,
      include: { grupo: { select: { id: true, nome: true } }, marca: { select: { id: true, nome: true } }, exame: true },
      orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
      take: q?.take ? Number(q.take) : 2000,
    });
    return { itens, total: itens.length };
  }

  async getItem(id: string) {
    const item = await this.prisma.itemCatalogo.findUnique({
      where: { id },
      include: { grupo: true, marca: true, exame: true, overrides: true, composicao: { include: { item: { select: { id: true, nome: true, preco: true } } } } },
    });
    if (!item) throw new NotFoundException('Item não encontrado');
    return item;
  }

  private async proximoCodigo(): Promise<number> {
    const max = await this.prisma.itemCatalogo.aggregate({ _max: { codigo: true } });
    return (max._max.codigo || 0) + 1;
  }

  // Separa os campos próprios do item das extensões (exame/composição/overrides).
  private camposItem(dto: any) {
    const d: any = {
      tipo: dto.tipo,
      nome: dto.nome?.trim(),
      grupoId: dto.grupoId || null,
      custo: dto.custo != null ? Number(dto.custo) : null,
      markup: dto.markup != null ? Number(dto.markup) : null,
      preco: Number(dto.preco) || 0,
      exibeListaPreco: dto.exibeListaPreco ?? true,
      permiteAlterarPreco: dto.permiteAlterarPreco ?? true,
      codigoBarras: dto.codigoBarras || null,
      unidadeVenda: dto.unidadeVenda || null,
      marcaId: dto.marcaId || null,
      proposito: dto.proposito || 'VENDA',
      duracaoMin: dto.duracaoMin != null ? Number(dto.duracaoMin) : null,
      controlaEstoque: !!dto.controlaEstoque,
      estoqueAtual: dto.estoqueAtual != null ? Number(dto.estoqueAtual) : 0,
      estoqueMin: dto.estoqueMin != null ? Number(dto.estoqueMin) : null,
      estoqueMax: dto.estoqueMax != null ? Number(dto.estoqueMax) : null,
      controlaValidade: !!dto.controlaValidade,
      comissionado: !!dto.comissionado,
      comissaoTipo: dto.comissaoTipo || null,
      comissaoValor: dto.comissaoValor != null ? Number(dto.comissaoValor) : null,
      descontoModo: dto.descontoModo || 'LIMITE_GERAL',
      descontoLimite: dto.descontoLimite != null ? Number(dto.descontoLimite) : null,
      protocoloTemplateId: dto.protocoloTemplateId || null,
      ativo: dto.ativo ?? true,
    };
    return d;
  }

  async criarItem(dto: any, user?: any) {
    if (!dto?.nome?.trim()) throw new BadRequestException('Informe o nome do item');
    if (!dto?.tipo) throw new BadRequestException('Informe o tipo do item');
    const codigo = await this.proximoCodigo();
    const base = this.camposItem(dto);
    const item = await this.prisma.itemCatalogo.create({ data: { ...base, codigo } });
    // extensão EXAME
    if (dto.tipo === 'EXAME' && dto.exame) {
      await this.prisma.itemExame.create({ data: { itemId: item.id, fornecedorId: dto.exame.fornecedorId || null, custoLab: dto.exame.custoLab != null ? Number(dto.exame.custoLab) : null, prazoResultadoDias: dto.exame.prazoResultadoDias != null ? Number(dto.exame.prazoResultadoDias) : null, categoria: dto.exame.categoria || null, externo: !!dto.exame.externo } });
    }
    await this.syncComposicao(item.id, dto.composicao);
    await this.syncOverrides(item.id, dto.overrides);
    await this.log(item.id, 'criado', `Item "${item.nome}" criado (${item.tipo})`, user);
    return this.getItem(item.id);
  }

  async atualizarItem(id: string, dto: any, user?: any) {
    const antes = await this.prisma.itemCatalogo.findUnique({ where: { id } });
    if (!antes) throw new NotFoundException('Item não encontrado');
    const base = this.camposItem(dto);
    await this.prisma.itemCatalogo.update({ where: { id }, data: base });
    if (dto.tipo === 'EXAME') {
      const ex = { fornecedorId: dto.exame?.fornecedorId || null, custoLab: dto.exame?.custoLab != null ? Number(dto.exame.custoLab) : null, prazoResultadoDias: dto.exame?.prazoResultadoDias != null ? Number(dto.exame.prazoResultadoDias) : null, categoria: dto.exame?.categoria || null, externo: !!dto.exame?.externo };
      await this.prisma.itemExame.upsert({ where: { itemId: id }, create: { itemId: id, ...ex }, update: ex });
    } else {
      await this.prisma.itemExame.deleteMany({ where: { itemId: id } });
    }
    if (dto.composicao !== undefined) await this.syncComposicao(id, dto.composicao);
    if (dto.overrides !== undefined) await this.syncOverrides(id, dto.overrides);
    await this.log(id, 'alterado', `Item "${base.nome}" atualizado`, user);
    return this.getItem(id);
  }

  private async syncComposicao(paiId: string, comp?: any[]) {
    if (comp === undefined) return;
    await this.prisma.itemComposicao.deleteMany({ where: { paiId } });
    const linhas = (comp || []).filter((c) => c?.itemId).map((c) => ({ paiId, itemId: c.itemId, quantidade: Number(c.quantidade) || 1 }));
    if (linhas.length) await this.prisma.itemComposicao.createMany({ data: linhas });
  }
  private async syncOverrides(itemId: string, ov?: any[]) {
    if (ov === undefined) return;
    await this.prisma.itemComissaoOverride.deleteMany({ where: { itemId } });
    const linhas = (ov || []).filter((o) => o?.userId && o?.comissaoTipo).map((o) => ({ itemId, userId: o.userId, comissaoTipo: o.comissaoTipo, comissaoValor: Number(o.comissaoValor) || 0 }));
    if (linhas.length) await this.prisma.itemComissaoOverride.createMany({ data: linhas });
  }

  async arquivarItem(id: string, arquivar: boolean, user?: any) {
    const item = await this.prisma.itemCatalogo.update({ where: { id }, data: { arquivado: arquivar } });
    await this.log(id, arquivar ? 'arquivado' : 'reativado', arquivar ? 'Item arquivado' : 'Item reativado', user);
    return item;
  }

  async excluirItem(id: string, user?: any) {
    // Exclusão real (irreversível). Cascade remove exame/composição/overrides/histórico.
    const item = await this.prisma.itemCatalogo.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item não encontrado');
    await this.prisma.itemCatalogo.delete({ where: { id } });
    return { ok: true };
  }

  async historicoItem(id: string) {
    return this.prisma.itemHistorico.findMany({ where: { itemId: id }, orderBy: { createdAt: 'desc' }, take: 200 });
  }
}
