import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePipelineDto, UpdatePipelineDto, CreateEstagioDto, UpdateEstagioDto } from './dto/pipeline.dto';

@Injectable()
export class PipelinesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeInactive = false) {
    return this.prisma.pipelineDefinition.findMany({
      where: includeInactive ? {} : { ativo: true },
      include: { estagios: { orderBy: { ordem: 'asc' } }, _count: { select: { estagios: true } } },
      orderBy: [{ ativo: 'desc' }, { ordem: 'asc' }, { nome: 'asc' }],
    });
  }
  async create(dto: CreatePipelineDto) {
    return this.prisma.pipelineDefinition.create({ data: dto, include: { estagios: true } });
  }
  async update(id: string, dto: UpdatePipelineDto) {
    const exists = await this.prisma.pipelineDefinition.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Pipeline não encontrado');
    return this.prisma.pipelineDefinition.update({ where: { id }, data: dto, include: { estagios: true } });
  }
  async remove(id: string) {
    const exists = await this.prisma.pipelineDefinition.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Pipeline não encontrado');
    return this.prisma.pipelineDefinition.delete({ where: { id } });
  }

  async createEstagio(dto: CreateEstagioDto) { return this.prisma.pipelineEstagio.create({ data: dto }); }
  async updateEstagio(id: string, dto: UpdateEstagioDto) {
    const exists = await this.prisma.pipelineEstagio.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Estágio não encontrado');
    return this.prisma.pipelineEstagio.update({ where: { id }, data: dto });
  }
  async removeEstagio(id: string) {
    const exists = await this.prisma.pipelineEstagio.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Estágio não encontrado');
    return this.prisma.pipelineEstagio.delete({ where: { id } });
  }

  async seedPacoteInicial() {
    const count = await this.prisma.pipelineDefinition.count();
    if (count > 0) return { skipped: true, message: 'Já existem pipelines', total: count };

    const pipelines = [
      {
        nome: 'Pipeline Padrão de Leads',
        escopo: 'LEAD' as const,
        descricao: 'Fluxo padrão de qualificação de leads recém-capturados',
        cor: '#3C3489',
        isPadrao: true,
        estagios: [
          { nome: 'Novo lead', ordem: 1, cor: '#A0AEC0', ehInicial: true, diasMaxParar: 1 },
          { nome: 'Em contato', ordem: 2, cor: '#3182CE', diasMaxParar: 3 },
          { nome: 'Qualificado', ordem: 3, cor: '#805AD5', diasMaxParar: 5 },
          { nome: 'Agendado', ordem: 4, cor: '#38A169', ehGanho: true },
          { nome: 'Perdido', ordem: 5, cor: '#E53E3E', ehPerda: true },
        ],
      },
      {
        nome: 'Vendas de Pacotes',
        escopo: 'CLIENTE' as const,
        descricao: 'Acompanhamento da venda de pacotes de fisioterapia/acupuntura',
        cor: '#00798A',
        estagios: [
          { nome: 'Identificado', ordem: 1, cor: '#A0AEC0', ehInicial: true },
          { nome: 'Apresentado', ordem: 2, cor: '#3182CE', diasMaxParar: 2 },
          { nome: 'Negociando', ordem: 3, cor: '#D69E2E', diasMaxParar: 5 },
          { nome: 'Vendido', ordem: 4, cor: '#38A169', ehGanho: true },
          { nome: 'Não fechou', ordem: 5, cor: '#E53E3E', ehPerda: true },
        ],
      },
      {
        nome: 'Pós-venda / Fidelização',
        escopo: 'CLIENTE' as const,
        descricao: 'Jornada do cliente pós-primeira consulta',
        cor: '#8a6313',
        estagios: [
          { nome: 'Primeira consulta', ordem: 1, cor: '#A0AEC0', ehInicial: true },
          { nome: 'Retornou', ordem: 2, cor: '#3182CE', diasMaxParar: 30 },
          { nome: 'Engajado', ordem: 3, cor: '#805AD5', diasMaxParar: 60 },
          { nome: 'Fidelizado', ordem: 4, cor: '#38A169', ehGanho: true },
          { nome: 'Inativo', ordem: 5, cor: '#9CA3AF', ehPerda: true },
        ],
      },
    ];

    let totalP = 0, totalE = 0;
    for (const p of pipelines) {
      const { estagios, ...pData } = p;
      const created = await this.prisma.pipelineDefinition.create({ data: pData });
      totalP++;
      for (const e of estagios) {
        await this.prisma.pipelineEstagio.create({ data: { ...e, pipelineId: created.id } });
        totalE++;
      }
    }
    return { skipped: false, pipelinesCriados: totalP, estagiosCriados: totalE };
  }

  async importBatch(rows: any[], upsert = true) {
    let criados = 0, atualizados = 0, ignorados = 0;
    const ESC_MAP: Record<string, string> = { 'lead': 'LEAD', 'cliente': 'CLIENTE', 'projeto': 'PROJETO', 'custom': 'CUSTOM' };
    for (const r of rows) {
      const nome = r.nome;
      if (!nome) { ignorados++; continue; }
      const escKey = (r.escopo || 'custom').toString().toLowerCase().trim();
      const data: any = {
        nome, escopo: (ESC_MAP[escKey] || 'CUSTOM') as any,
        descricao: r.descricao || null, cor: r.cor || null,
        ativo: r.ativo !== undefined ? r.ativo : true,
        ordem: r.ordem ?? 0,
        isPadrao: r.isPadrao ?? false,
      };
      const existente = await this.prisma.pipelineDefinition.findFirst({ where: { nome: { equals: nome, mode: 'insensitive' } } });
      if (existente) {
        if (!upsert) { ignorados++; continue; }
        await this.prisma.pipelineDefinition.update({ where: { id: existente.id }, data });
        atualizados++;
      } else {
        await this.prisma.pipelineDefinition.create({ data });
        criados++;
      }
    }
    return { criados, atualizados, ignorados };
  }
}