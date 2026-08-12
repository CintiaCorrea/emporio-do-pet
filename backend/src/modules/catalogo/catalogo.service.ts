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

  // FONTE ÚNICA de venda a partir do catálogo NOVO — normalizada no MESMO formato que a
  // lib/catalogoVendavel do front espera (id, nome, valorPadrao, custoPadrao, tipo, categoria,
  // + lab do exame). `_novo: true` marca que veio daqui (o front vende por descrição+valor).
  async vendavel() {
    const itens = await this.prisma.itemCatalogo.findMany({
      where: { ativo: true, arquivado: false },
      include: { grupo: { select: { nome: true } }, exame: true },
      orderBy: { nome: 'asc' },
      take: 8000,
    });
    const fornIds = [...new Set(itens.map((i) => i.exame?.fornecedorId).filter(Boolean) as string[])];
    const forns = fornIds.length ? await this.prisma.fornecedor.findMany({ where: { id: { in: fornIds } }, select: { id: true, nome: true } }) : [];
    const fornMap = new Map(forns.map((f) => [f.id, f.nome]));
    return itens.map((i) => ({
      id: i.id,
      nome: i.nome,
      valorPadrao: i.preco,
      // EXAME: o CUSTO da linha é o custo do laboratório (alimenta o a-pagar do lab). Demais: custo normal.
      custoPadrao: (i.tipo === 'EXAME' ? (i.exame?.custoLab ?? i.custo) : i.custo) ?? undefined,
      tipo: i.tipo,
      categoria: i.grupo?.nome ?? null,
      _novo: true,
      _exame: i.tipo === 'EXAME',
      _fornecedorId: i.exame?.fornecedorId ?? null,
      _fornecedorNome: i.exame?.fornecedorId ? (fornMap.get(i.exame.fornecedorId) ?? null) : null,
      _descontoModo: i.descontoModo,     // política de desconto por item (Fatia 6b)
      _descontoLimite: i.descontoLimite ?? null,
    }));
  }

  // ── ESTOQUE (Fatia 4): movimentações + motivos + previsão ─────────
  async listMotivos() {
    let m = await this.prisma.catMotivoSaida.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } });
    if (m.length === 0) { // semeia os comuns na 1ª vez
      await this.prisma.catMotivoSaida.createMany({ data: ['Avaria', 'Consumo interno', 'Perda de validade', 'Doação', 'Devolução de compra'].map((nome) => ({ nome })) });
      m = await this.prisma.catMotivoSaida.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } });
    }
    return m;
  }
  async criarMotivo(nome: string) {
    const n = String(nome || '').trim(); if (!n) throw new BadRequestException('Informe o motivo');
    return this.prisma.catMotivoSaida.create({ data: { nome: n } });
  }
  async movimentarEstoque(itemId: string, dto: any, user?: any) {
    const item = await this.prisma.itemCatalogo.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item não encontrado');
    const tipo = String(dto?.tipo || '').toUpperCase();
    const qtd = Number(dto?.quantidade);
    if (!['ENTRADA', 'SAIDA', 'AJUSTE', 'INVENTARIO'].includes(tipo)) throw new BadRequestException('Tipo de movimento inválido');
    if (isNaN(qtd) || qtd < 0) throw new BadRequestException('Quantidade inválida');
    const saldoAntes = Number(item.estoqueAtual) || 0;
    const saldoDepois = tipo === 'ENTRADA' ? saldoAntes + qtd : tipo === 'SAIDA' ? saldoAntes - qtd : qtd;
    let motivoNome: string | undefined;
    if (dto.motivoId) { const mo = await this.prisma.catMotivoSaida.findUnique({ where: { id: dto.motivoId } }); motivoNome = mo?.nome; }
    const [mov] = await this.prisma.$transaction([
      this.prisma.catEstoqueMovimento.create({ data: { itemId, tipo: tipo as any, quantidade: qtd, saldoAntes, saldoDepois, custoUnitario: dto.custoUnitario != null ? Number(dto.custoUnitario) : null, motivoId: dto.motivoId || null, motivoNome: motivoNome || null, origem: dto.origem || 'MANUAL', refId: dto.refId || null, userId: user?.id || user?.userId, userName: user?.name || user?.nome, obs: dto.obs || null } }),
      this.prisma.itemCatalogo.update({ where: { id: itemId }, data: { estoqueAtual: saldoDepois } }),
    ]);
    await this.log(itemId, 'estoque', `${tipo}: ${saldoAntes} → ${saldoDepois}${motivoNome ? ' (' + motivoNome + ')' : ''}`, user);
    return mov;
  }
  async estoqueDoItem(itemId: string) {
    const item = await this.prisma.itemCatalogo.findUnique({ where: { id: itemId }, select: { id: true, nome: true, estoqueAtual: true, estoqueMin: true, estoqueMax: true, controlaEstoque: true } });
    if (!item) throw new NotFoundException('Item não encontrado');
    const desde = new Date(Date.now() - 30 * 86400000);
    const saidas = await this.prisma.catEstoqueMovimento.aggregate({ where: { itemId, tipo: 'SAIDA', createdAt: { gte: desde } }, _sum: { quantidade: true } });
    const consumo30 = Number(saidas._sum.quantidade) || 0;
    const mediaDia = consumo30 / 30;
    const duracaoDias = mediaDia > 0 ? Math.round(Number(item.estoqueAtual) / mediaDia) : null;
    const movimentos = await this.prisma.catEstoqueMovimento.findMany({ where: { itemId }, orderBy: { createdAt: 'desc' }, take: 30 });
    return { item, mediaMensal: Math.round(consumo30 * 10) / 10, duracaoDias, movimentos };
  }

  // ── INVENTÁRIO (Fatia 4b): contagem física → ajustes ─────────────
  async criarInventario(user?: any) {
    return this.prisma.catInventario.create({ data: { responsavelId: user?.id || user?.userId, responsavelNome: user?.name || user?.nome, status: 'ABERTO' } });
  }
  async listInventarios() {
    return this.prisma.catInventario.findMany({ orderBy: { createdAt: 'desc' }, take: 30, include: { _count: { select: { itens: true } } } });
  }
  async getInventario(id: string) {
    const inv = await this.prisma.catInventario.findUnique({ where: { id }, include: { itens: { orderBy: { createdAt: 'asc' } } } });
    if (!inv) throw new NotFoundException('Inventário não encontrado');
    return inv;
  }
  async addContagem(invId: string, dto: any, user?: any) {
    const inv = await this.prisma.catInventario.findUnique({ where: { id: invId } });
    if (!inv) throw new NotFoundException('Inventário não encontrado');
    if (inv.status !== 'ABERTO') throw new BadRequestException('Inventário já fechado');
    const item = await this.prisma.itemCatalogo.findUnique({ where: { id: dto?.itemId }, select: { id: true, nome: true, estoqueAtual: true } });
    if (!item) throw new NotFoundException('Item não encontrado');
    const contada = Number(dto?.quantidadeContada) || 0;
    return this.prisma.catInventarioItem.upsert({
      where: { inventarioId_itemId: { inventarioId: invId, itemId: dto.itemId } },
      create: { inventarioId: invId, itemId: dto.itemId, itemNome: item.nome, quantidadeSistema: Number(item.estoqueAtual) || 0, quantidadeContada: contada },
      update: { quantidadeContada: contada },
    });
  }
  async removeContagem(rowId: string) {
    await this.prisma.catInventarioItem.delete({ where: { id: rowId } });
    return { ok: true };
  }
  async fecharInventario(invId: string, user?: any) {
    const inv = await this.prisma.catInventario.findUnique({ where: { id: invId }, include: { itens: true } });
    if (!inv) throw new NotFoundException('Inventário não encontrado');
    if (inv.status !== 'ABERTO') throw new BadRequestException('Inventário já fechado');
    let corretos = 0, corrigidos = 0;
    for (const it of inv.itens) {
      if (Number(it.quantidadeContada) === Number(it.quantidadeSistema)) { corretos++; continue; }
      corrigidos++;
      // aplica AJUSTE (saldo absoluto = contada), origem INVENTARIO — o físico manda.
      await this.movimentarEstoque(it.itemId, { tipo: 'INVENTARIO', quantidade: Number(it.quantidadeContada), origem: 'INVENTARIO', refId: invId, obs: `Inventário (sistema tinha ${it.quantidadeSistema})` }, user);
      await this.prisma.catInventarioItem.update({ where: { id: it.id }, data: { aplicado: true } });
    }
    return this.prisma.catInventario.update({ where: { id: invId }, data: { status: 'FECHADO', fechadoAt: new Date(), totalItens: inv.itens.length, totalCorretos: corretos, totalCorrigidos: corrigidos } });
  }

  // Baixa de estoque na VENDA (idempotente): itens do catálogo novo vendidos numa venda PAGA, que
  // controlam estoque, geram UMA saída (origem VENDA) — dedup por refId=appointmentItemId. Roda no cron.
  async processarEstoqueVendas() {
    const itens = await this.prisma.appointmentItem.findMany({
      where: { catalogoItemId: { not: null }, quantidade: { gt: 0 }, appointment: { is: { recebimentos: { some: {} } } } },
      select: { id: true, catalogoItemId: true, quantidade: true },
      take: 2000,
    });
    if (itens.length === 0) return { baixados: 0 };
    const jaFeitos = await this.prisma.catEstoqueMovimento.findMany({ where: { origem: 'VENDA', refId: { in: itens.map((i) => i.id) } }, select: { refId: true } });
    const feitos = new Set(jaFeitos.map((x) => x.refId));
    const novos = itens.filter((i) => !feitos.has(i.id));
    if (novos.length === 0) return { baixados: 0 };
    const catIds = [...new Set(novos.map((i) => i.catalogoItemId as string))];
    const cats = await this.prisma.itemCatalogo.findMany({ where: { id: { in: catIds }, controlaEstoque: true }, select: { id: true } });
    const controla = new Set(cats.map((c) => c.id));
    let baixados = 0;
    for (const it of novos) {
      if (!controla.has(it.catalogoItemId as string)) continue;
      try { await this.movimentarEstoque(it.catalogoItemId as string, { tipo: 'SAIDA', quantidade: Number(it.quantidade) || 1, origem: 'VENDA', refId: it.id }, { name: 'Venda' }); baixados++; } catch { /* segue */ }
    }
    return { baixados };
  }

  // Comissão por ITEM do catálogo novo (Fatia 6b): popula comissaoTipo/comissaoValor na linha de venda
  // a partir da config do item (+ override por funcionário) — o motor de comissão já lê esses 2 campos.
  // "não comissionado" vira VALOR_FIXO 0 (comissão zero). Processa cada linha UMA vez (comissaoTipo null).
  async processarComissaoVendas() {
    const itens = await this.prisma.appointmentItem.findMany({
      where: { catalogoItemId: { not: null }, executorUserId: { not: null }, comissaoExtratoId: null, comissaoTipo: null },
      select: { id: true, catalogoItemId: true, executorUserId: true },
      take: 3000,
    });
    if (itens.length === 0) return { comissoes: 0 };
    const catIds = [...new Set(itens.map((i) => i.catalogoItemId as string))];
    const cats = await this.prisma.itemCatalogo.findMany({
      where: { id: { in: catIds } },
      select: { id: true, comissionado: true, comissaoTipo: true, comissaoValor: true, overrides: { select: { userId: true, comissaoTipo: true, comissaoValor: true } } },
    });
    const catMap = new Map(cats.map((c) => [c.id, c]));
    let n = 0;
    for (const it of itens) {
      const cat = catMap.get(it.catalogoItemId as string); if (!cat) continue;
      const ov = cat.overrides.find((o) => o.userId === it.executorUserId); // camada 2: por funcionário
      let tipo: string, valor: number;
      if (ov) { tipo = ov.comissaoTipo; valor = ov.comissaoValor; }
      else if (cat.comissionado && cat.comissaoTipo && cat.comissaoValor != null) { tipo = cat.comissaoTipo; valor = cat.comissaoValor; }
      else { tipo = 'VALOR_FIXO'; valor = 0; } // não comissionado → comissão zero
      await this.prisma.appointmentItem.update({ where: { id: it.id }, data: { comissaoTipo: tipo, comissaoValor: valor } });
      n++;
    }
    return { comissoes: n };
  }

  // Vacina → PROTOCOLO (Fatia 7a): vender uma VACINA (do cat novo, com protocolo) numa venda com pet
  // agenda o protocolo (doses/reforço) automaticamente. Idempotente por (appointmentId, templateId).
  async processarVacinaVendas() {
    const itens = await this.prisma.appointmentItem.findMany({
      where: { catalogoItemId: { not: null }, appointment: { is: { recebimentos: { some: {} } } } },
      select: { id: true, catalogoItemId: true, appointment: { select: { id: true, petId: true, tutorId: true, date: true } } },
      take: 2000,
    });
    if (itens.length === 0) return { agendados: 0 };
    const catIds = [...new Set(itens.map((i) => i.catalogoItemId as string))];
    const cats = await this.prisma.itemCatalogo.findMany({ where: { id: { in: catIds }, tipo: 'VACINA', protocoloTemplateId: { not: null } }, select: { id: true, protocoloTemplateId: true } });
    if (cats.length === 0) return { agendados: 0 };
    const catMap = new Map(cats.map((c) => [c.id, c.protocoloTemplateId as string]));
    const candidatos = itens.filter((i) => catMap.has(i.catalogoItemId as string));
    if (candidatos.length === 0) return { agendados: 0 };
    const apptIds = [...new Set(candidatos.map((c) => c.appointment!.id))];
    const jaAplicados = await this.prisma.protocoloAplicado.findMany({ where: { appointmentId: { in: apptIds } }, select: { appointmentId: true, templateId: true } });
    const feitos = new Set(jaAplicados.map((x) => x.appointmentId + '|' + x.templateId));
    const templates = await this.prisma.protocoloTemplate.findMany({ where: { id: { in: [...new Set(cats.map((c) => c.protocoloTemplateId as string))] } } });
    const tmplMap = new Map(templates.map((t) => [t.id, t]));
    let agendados = 0;
    for (const it of candidatos) {
      const tmplId = catMap.get(it.catalogoItemId as string)!;
      if (feitos.has(it.appointment!.id + '|' + tmplId)) continue;
      const tmpl = tmplMap.get(tmplId); if (!tmpl) continue;
      const nDoses = Math.max(1, Math.min(tmpl.doses ?? 1, 60));
      const intervalo = tmpl.intervaloDias ?? 0;
      const dataInicial = it.appointment!.date ? new Date(it.appointment!.date) : new Date();
      const doses = Array.from({ length: nDoses }).map((_, k) => ({ numero: k + 1, dataPrevista: new Date(dataInicial.getTime() + k * intervalo * 86400000), status: 'PENDENTE' as const }));
      try {
        await this.prisma.protocoloAplicado.create({ data: { petId: it.appointment!.petId as string, tutorId: it.appointment!.tutorId ?? null, tipo: tmpl.tipo, templateId: tmplId, nomeProtocolo: [tmpl.nome, tmpl.variante].filter(Boolean).join(' - '), dataInicial, appointmentId: it.appointment!.id, doses: { create: doses } } });
        feitos.add(it.appointment!.id + '|' + tmplId); agendados++;
      } catch { /* segue */ }
    }
    return { agendados };
  }

  // ── IMPORTADOR (CSV) ──────────────────────────────────────────────
  private norm(s?: string) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
  private parseCsvLine(line: string, sep: string): string[] {
    const out: string[] = []; let cur = ''; let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else { if (c === '"') q = true; else if (c === sep) { out.push(cur); cur = ''; } else cur += c; }
    }
    out.push(cur); return out.map((s) => s.trim());
  }
  private csvNum(s?: string): number | null {
    if (s == null) return null; let v = String(s).trim(); if (!v) return null;
    v = v.replace(/[R$\s]/g, '');
    if (v.includes(',')) v = v.replace(/\./g, '').replace(',', '.'); // 1.234,56 -> 1234.56
    const n = Number(v); return isNaN(n) ? null : n;
  }
  private tipoDe(s?: string): string {
    const t = this.norm(s);
    if (/servico/.test(t)) return 'SERVICO';
    if (/exame/.test(t)) return 'EXAME';
    if (/vacina/.test(t)) return 'VACINA';
    if (/pacote/.test(t)) return 'PACOTE';
    if (/kit/.test(t)) return 'KIT';
    return 'PRODUTO';
  }
  private boolC(s?: string) { return /^(sim|s|1|true|x|v)/i.test(String(s || '').trim()); }
  private propC(s?: string) { const t = this.norm(s); if (t.includes('ambos') || (t.includes('venda') && t.includes('consumo'))) return 'AMBOS'; if (t.includes('consumo')) return 'CONSUMO_INTERNO'; return 'VENDA'; }
  private comTipoC(s?: string): 'PERCENTUAL' | 'VALOR_FIXO' | null { const t = String(s || ''); if (/r\$|valor|fixo/i.test(t)) return 'VALOR_FIXO'; if (/%|percent/i.test(t)) return 'PERCENTUAL'; return null; }

  async importarItens(csv: string, opts: { dryRun?: boolean } = {}) {
    const dryRun = !!opts.dryRun;
    const linhas = String(csv || '').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
    if (!linhas.length) throw new BadRequestException('Planilha vazia');
    const h0 = linhas[0];
    const cont = (s: string, ch: string) => s.split(ch).length - 1;
    const sep = cont(h0, '\t') ? '\t' : (cont(h0, ';') > 0 && cont(h0, ';') >= cont(h0, ',')) ? ';' : cont(h0, ',') > 0 ? ',' : ';';
    const header = this.parseCsvLine(h0, sep).map((x) => this.norm(x));
    const col = (nomes: string[]) => { for (const n of nomes) { const i = header.indexOf(this.norm(n)); if (i >= 0) return i; } return -1; };
    const iTipo = col(['tipo']), iNome = col(['nome']), iGrupo = col(['grupo']), iPreco = col(['preco', 'preco_venda', 'preço']),
      iCusto = col(['custo']), iUnid = col(['unidade', 'unidade_venda']), iMarca = col(['marca']), iBarras = col(['codigo_barras', 'cod_barras', 'ean']),
      iCtrlEst = col(['controla_estoque']), iEstAtual = col(['estoque_atual', 'estoque']), iEstMin = col(['estoque_min']), iEstMax = col(['estoque_max']),
      iProp = col(['proposito']), iComTipo = col(['comissao_tipo']), iComVal = col(['comissao_valor', 'comissao_%', 'comissao']),
      iLab = col(['laboratorio', 'lab']), iCustoLab = col(['custo_lab']), iPrazo = col(['prazo_dias', 'prazo']), iCatEx = col(['categoria', 'categoria_exame']), iExterno = col(['externo', 'interno_externo']),
      iProto = col(['protocolo']);
    if (iNome < 0) throw new BadRequestException('Não achei a coluna "nome" no cabeçalho da planilha.');

    const [grupos, marcas, forns, protos, existentes] = await Promise.all([
      this.prisma.catGrupo.findMany(), this.prisma.catMarca.findMany(),
      this.prisma.fornecedor.findMany({ select: { id: true, nome: true } }),
      this.prisma.protocoloTemplate.findMany({ select: { id: true, nome: true } }),
      this.prisma.itemCatalogo.findMany({ select: { id: true, nome: true, tipo: true } }),
    ]);
    const mapaGrupo = new Map(grupos.filter((g) => !g.agrupador).map((g) => [this.norm(g.nome), g.id]));
    const mapaMarca = new Map(marcas.map((m) => [this.norm(m.nome), m.id]));
    const mapaLab = new Map(forns.map((f) => [this.norm(f.nome), f.id]));
    const mapaProto = new Map(protos.map((p) => [this.norm(p.nome), p.id]));
    const mapaExist = new Map(existentes.map((e) => [e.tipo + '|' + this.norm(e.nome), e.id]));

    const rows: any[] = [];
    const vistos = new Set<string>();
    let dup = 0; const suspeitos: string[] = [];
    const gruposNovos = new Set<string>(), marcasNovas = new Set<string>(), labsNovos = new Set<string>();
    for (let i = 1; i < linhas.length; i++) {
      const c = this.parseCsvLine(linhas[i], sep);
      const nome = (c[iNome] || '').trim(); if (!nome) continue;
      const tipo = this.tipoDe(iTipo >= 0 ? c[iTipo] : 'PRODUTO');
      const chave = tipo + '|' + this.norm(nome);
      if (vistos.has(chave)) { dup++; continue; } vistos.add(chave);
      const grupoNome = iGrupo >= 0 ? (c[iGrupo] || '').trim() : '';
      const preco = this.csvNum(iPreco >= 0 ? c[iPreco] : '') ?? 0;
      if (preco <= 0) suspeitos.push(`${nome} (preço 0)`);
      if (!grupoNome) suspeitos.push(`${nome} (sem grupo)`);
      if (grupoNome && !mapaGrupo.has(this.norm(grupoNome))) gruposNovos.add(grupoNome);
      const marcaNome = iMarca >= 0 ? (c[iMarca] || '').trim() : '';
      if (marcaNome && !mapaMarca.has(this.norm(marcaNome))) marcasNovas.add(marcaNome);
      const labNome = iLab >= 0 ? (c[iLab] || '').trim() : '';
      if (tipo === 'EXAME' && labNome && !mapaLab.has(this.norm(labNome))) labsNovos.add(labNome);
      const comVal = this.csvNum(iComVal >= 0 ? c[iComVal] : '');
      rows.push({
        tipo, nome, grupoNome, preco, custo: this.csvNum(c[iCusto]), unidade: (c[iUnid] || '').trim(), marcaNome, barras: (c[iBarras] || '').trim(),
        ctrlEst: this.boolC(c[iCtrlEst]), estAtual: this.csvNum(c[iEstAtual]), estMin: this.csvNum(c[iEstMin]), estMax: this.csvNum(c[iEstMax]),
        proposito: this.propC(c[iProp]), comVal, comTipo: this.comTipoC(c[iComTipo]) || (comVal != null ? 'PERCENTUAL' : null),
        labNome, custoLab: this.csvNum(c[iCustoLab]), prazo: this.csvNum(c[iPrazo]), catEx: (c[iCatEx] || '').trim(), externo: this.boolC(c[iExterno]),
        protoNome: (c[iProto] || '').trim(), atualiza: mapaExist.has(chave),
      });
    }
    const porTipo: Record<string, number> = {};
    for (const r of rows) porTipo[r.tipo] = (porTipo[r.tipo] || 0) + 1;
    const relatorio = {
      total: rows.length, duplicadosRemovidos: dup, porTipo,
      novos: rows.filter((r) => !r.atualiza).length, atualizados: rows.filter((r) => r.atualiza).length,
      gruposNovos: [...gruposNovos], marcasNovas: [...marcasNovas], labsNovos: [...labsNovos],
      totalSuspeitos: suspeitos.length, suspeitos: suspeitos.slice(0, 80),
      amostra: rows.slice(0, 12).map((r) => ({ tipo: r.tipo, nome: r.nome, grupo: r.grupoNome, preco: r.preco })),
    };
    if (dryRun) return { dryRun: true, ...relatorio };

    // cria grupos/marcas/labs que faltam
    for (const g of gruposNovos) { const gg = await this.prisma.catGrupo.create({ data: { nome: g } }); mapaGrupo.set(this.norm(g), gg.id); }
    for (const m of marcasNovas) { const mm = await this.prisma.catMarca.create({ data: { nome: m } }); mapaMarca.set(this.norm(m), mm.id); }
    for (const l of labsNovos) { const ll = await this.prisma.fornecedor.create({ data: { nome: l } }); mapaLab.set(this.norm(l), ll.id); }
    let codigo = await this.proximoCodigo();
    let criados = 0, atualizados = 0;
    for (const r of rows) {
      const data: any = {
        tipo: r.tipo, nome: r.nome, grupoId: r.grupoNome ? (mapaGrupo.get(this.norm(r.grupoNome)) || null) : null,
        preco: r.preco, custo: r.custo ?? null, unidadeVenda: r.unidade || null, marcaId: r.marcaNome ? (mapaMarca.get(this.norm(r.marcaNome)) || null) : null,
        codigoBarras: r.barras || null, controlaEstoque: !!r.ctrlEst, estoqueAtual: r.estAtual ?? 0, estoqueMin: r.estMin ?? null, estoqueMax: r.estMax ?? null,
        proposito: r.proposito || 'VENDA', comissionado: r.comVal != null, comissaoTipo: r.comTipo || null, comissaoValor: r.comVal ?? null,
        protocoloTemplateId: r.protoNome ? (mapaProto.get(this.norm(r.protoNome)) || null) : null,
      };
      const chave = r.tipo + '|' + this.norm(r.nome);
      const existId = mapaExist.get(chave);
      let itemId: string;
      if (existId) { await this.prisma.itemCatalogo.update({ where: { id: existId }, data }); itemId = existId; atualizados++; }
      else { const it = await this.prisma.itemCatalogo.create({ data: { ...data, codigo: codigo++ } }); itemId = it.id; mapaExist.set(chave, itemId); criados++; }
      if (r.tipo === 'EXAME') {
        const ex = { fornecedorId: r.labNome ? (mapaLab.get(this.norm(r.labNome)) || null) : null, custoLab: r.custoLab ?? null, prazoResultadoDias: r.prazo ?? null, categoria: r.catEx || null, externo: !!r.externo };
        await this.prisma.itemExame.upsert({ where: { itemId }, create: { itemId, ...ex }, update: ex });
      }
    }
    return { dryRun: false, ...relatorio, criados, atualizados };
  }
}
