import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMetaDto, UpdateMetaDto } from './dto/meta.dto';

@Injectable()
export class MetasService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.meta.findMany({ orderBy: [{ status: 'asc' }, { dataInicio: 'desc' }] });
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
