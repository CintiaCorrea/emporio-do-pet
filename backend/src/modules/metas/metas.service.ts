import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMetaDto, UpdateMetaDto } from './dto/meta.dto';

@Injectable()
export class MetasService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const metas = await this.prisma.meta.findMany({ orderBy: [{ status: 'asc' }, { dataInicio: 'desc' }] });
    // A "medida" (VALOR | QUANTIDADE) de cada meta fica numa lista de config — assim
    // não precisamos tocar o schema. Sem entrada = VALOR (padrão).
    const medKV = await this.prisma.listaItem.findMany({ where: { lista: 'meta_medida' } });
    const medMap: Record<string, string> = {};
    for (const k of medKV) { try { const o = JSON.parse(k.valor); if (o?.metaId) medMap[o.metaId] = o.medida || 'VALOR'; } catch { /* ignore */ } }
    const out: any[] = [];
    for (const m of metas) {
      const medida = medMap[m.id] || 'VALOR';
      const valorRealizado = await this.calcRealizado(m as any, medida);
      out.push({ ...m, medida, valorRealizado });
    }
    return out;
  }

  private periodoJanela(dataInicio: Date, periodicidade: string) {
    const start = new Date(dataInicio);
    const end = new Date(start);
    switch (periodicidade) {
      case 'SEMANAL': end.setDate(end.getDate() + 7); break;
      case 'TRIMESTRAL': end.setMonth(end.getMonth() + 3); break;
      case 'SEMESTRAL': end.setMonth(end.getMonth() + 6); break;
      case 'ANUAL': end.setFullYear(end.getFullYear() + 1); break;
      default: end.setMonth(end.getMonth() + 1); // MENSAL
    }
    return { start, end };
  }

  // Realizado AUTOMÁTICO: soma o valor (valorTotal) ou conta a quantidade dos itens de
  // venda no período, filtrando por vendedor (executor do item) e/ou serviço/produto.
  private async calcRealizado(meta: any, medida: string): Promise<number> {
    if (!meta?.dataInicio) return 0;
    const { start, end } = this.periodoJanela(new Date(meta.dataInicio), meta.periodicidade || 'MENSAL');
    const where: any = { appointment: { date: { gte: start, lt: end } } };
    if (meta.servicoId) where.OR = [{ servicoId: meta.servicoId }, { productId: meta.servicoId }];
    if (meta.profissionalId) where.executorUserId = meta.profissionalId;
    const itens = await this.prisma.appointmentItem.findMany({ where, select: { valorTotal: true, quantidade: true } });
    if (String(medida).toUpperCase() === 'QUANTIDADE') return itens.reduce((s, it: any) => s + Number(it.quantidade || 0), 0);
    return Number(itens.reduce((s, it: any) => s + Number(it.valorTotal || 0), 0).toFixed(2));
  }
  async create(dto: CreateMetaDto) {
    const data = this.normalize(dto);
    return this.prisma.meta.create({ data });
  }
  async update(id: string, dto: UpdateMetaDto) {
    const exists = await this.prisma.meta.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Meta não encontrada');
    return this.prisma.meta.update({ where: { id }, data: this.normalize(dto) });
  }
  async remove(id: string) {
    const exists = await this.prisma.meta.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Meta não encontrada');
    return this.prisma.meta.delete({ where: { id } });
  }
  private normalize(dto: any) {
    const out: any = { ...dto };
    if (out.dataInicio && typeof out.dataInicio === 'string') out.dataInicio = new Date(out.dataInicio);
    return out;
  }

  async importBatch(rows: any[], upsert = true) {
    let criados = 0, atualizados = 0, ignorados = 0;
    const TIPO_MAP: Record<string, string> = {
      'faturamento_geral': 'FATURAMENTO_GERAL', 'faturamento geral': 'FATURAMENTO_GERAL',
      'faturamento_individual': 'FATURAMENTO_INDIVIDUAL', 'faturamento individual': 'FATURAMENTO_INDIVIDUAL',
      'atendimentos': 'ATENDIMENTOS',
      'servico_especifico': 'SERVICO_ESPECIFICO', 'serviço específico': 'SERVICO_ESPECIFICO',
      'conversoes': 'CONVERSOES', 'conversões': 'CONVERSOES',
      'nps': 'NPS',
    };
    const PER_MAP: Record<string, string> = {
      'semanal': 'SEMANAL', 'mensal': 'MENSAL', 'trimestral': 'TRIMESTRAL',
      'semestral': 'SEMESTRAL', 'anual': 'ANUAL',
    };
    const ST_MAP: Record<string, string> = {
      'em_andamento': 'EM_ANDAMENTO', 'em andamento': 'EM_ANDAMENTO',
      'atingida': 'ATINGIDA', 'nao_atingida': 'NAO_ATINGIDA', 'não atingida': 'NAO_ATINGIDA',
    };
    for (const r of rows) {
      if (!r.tipo || r.valorMeta == null) { ignorados++; continue; }
      const data: any = {
        tipo: (TIPO_MAP[(r.tipo || '').toString().toLowerCase().trim()] || 'FATURAMENTO_GERAL') as any,
        periodicidade: (PER_MAP[(r.periodicidade || 'mensal').toString().toLowerCase().trim()] || 'MENSAL') as any,
        profissionalId: r.profissionalId || r.profissional_id || null,
        servicoId: r.servicoId || r.servico_id || null,
        dataInicio: r.dataInicio ? new Date(r.dataInicio) : new Date(),
        valorMeta: r.valorMeta ?? r.valor_meta,
        valorRealizado: r.valorRealizado ?? r.valor_realizado ?? 0,
        status: (ST_MAP[(r.status || 'em andamento').toString().toLowerCase().trim()] || 'EM_ANDAMENTO') as any,
        observacoes: r.observacoes || null,
      };
      // sem chave única natural — sempre cria
      await this.prisma.meta.create({ data });
      criados++;
    }
    return { criados, atualizados, ignorados };
  }
}
